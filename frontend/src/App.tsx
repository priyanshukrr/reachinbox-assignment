import { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";

type EmailStatus = "SCHEDULED" | "PROCESSING" | "SENT" | "FAILED";

interface Email {
  id: string;
  recipient: string;
  subject: string;
  body?: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: EmailStatus;
  messageId?: string | null;
  attempts?: number;
  createdAt?: string;
}

interface UserSession {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  campaignId: string;
}

const API_URL = "http://localhost:5000";

function App() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem("reachinbox_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "SCHEDULED" | "SENT" | "FAILED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Race condition guard: Request sequence counter to discard out-of-order fetch responses
  const fetchSeqRef = useRef(0);

  const campaignId = currentUser?.campaignId;

  const fetchEmails = useCallback(async () => {
    if (!campaignId) return;

    const currentSeq = ++fetchSeqRef.current;

    try {
      const response = await fetch(
        `${API_URL}/api/emails?campaignId=${campaignId}`
      );
      if (response.ok) {
        const data = await response.json();

        // Guard against out-of-order responses: ignore if a newer fetch was initiated
        if (currentSeq < fetchSeqRef.current) {
          return;
        }

        if (Array.isArray(data.emails)) {
          setEmails(data.emails);
          if (!selectedEmail && data.emails.length > 0) {
            setSelectedEmail(data.emails[0]);
          } else if (selectedEmail) {
            const updated = data.emails.find((e: Email) => e.id === selectedEmail.id);
            if (updated) setSelectedEmail(updated);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch emails:", err);
    }
  }, [campaignId, selectedEmail]);

  useEffect(() => {
    if (!currentUser) return;

    fetchEmails();
    const interval = setInterval(fetchEmails, 3000);
    return () => clearInterval(interval);
  }, [fetchEmails, currentUser]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginUsername || !loginPassword) {
      setLoginError("Please enter username and password.");
      return;
    }

    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      const user = data.user;
      setCurrentUser(user);
      localStorage.setItem("reachinbox_user", JSON.stringify(user));
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : "Invalid credentials"
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("reachinbox_user");
    setEmails([]);
    setSelectedEmail(null);
  };

  const scheduleEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;

    // Race condition guard 1: Prevent concurrent duplicate submissions if already loading
    if (loading) return;

    if (!recipient || !subject || !body || !scheduledAt) {
      setMessage("Please fill all fields.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/emails/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser.id,
          campaignId: currentUser.campaignId,
          recipient,
          subject,
          body,
          scheduledAt: new Date(scheduledAt).toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to schedule email");
      }

      const newEmail: Email = data.email;

      // Race condition guard 2: Optimistic state update guarantees immediate local render
      setEmails((prev) => {
        if (prev.some((e) => e.id === newEmail.id)) return prev;
        return [newEmail, ...prev];
      });

      setSelectedEmail(newEmail);

      // Re-sync with backend
      fetchEmails();

      setRecipient("");
      setSubject("");
      setBody("");
      setScheduledAt("");
      setShowScheduleModal(false);

      setMessage("Email scheduled successfully!");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  // Filter emails based on Active Tab and Search Query
  const filteredEmails = emails.filter((email) => {
    if (activeTab !== "ALL" && email.status !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        email.recipient.toLowerCase().includes(q) ||
        email.subject.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const scheduledCount = emails.filter((e) => e.status === "SCHEDULED").length;
  const sentCount = emails.filter((e) => e.status === "SENT").length;
  const failedCount = emails.filter((e) => e.status === "FAILED").length;

  // Unauthenticated Login View (Styled in Minecloud theme)
  if (!currentUser) {
    return (
      <div className="login-frame">
        <div className="login-modal">
          <div className="login-logo">
            <div className="nav-brand-logo">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>reachinbox</span>
          </div>

          <div className="login-title-box">
            <h2>Welcome back</h2>
            <p>Sign in to your campaign automation dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="modal-form">
            <label>
              Username
              <input
                type="text"
                placeholder="Enter your username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                placeholder="Enter your password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </label>

            <button
              type="submit"
              className="submit-btn"
              disabled={loginLoading}
            >
              {loginLoading ? "Signing in..." : "Sign In"}
            </button>

            {loginError && <div className="message error">{loginError}</div>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      {/* Top Navbar */}
      <header className="top-navbar">
        <div className="nav-brand">
          <div className="nav-brand-logo">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span>reachinbox</span>
        </div>

        <div className="nav-tabs">
          <button className="tab-btn active">📁 Campaigns</button>
          <button className="tab-btn">⚡ Activity</button>
          <button className="tab-btn">📅 Queue</button>
          <button className="tab-btn">👤 Profile</button>
        </div>

        <div className="nav-controls">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search anything..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="user-badge">
            <div className="user-avatar">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name-text">
                {currentUser.name}
                {currentUser.role === "ADMIN" && (
                  <span className="admin-tag">ADMIN</span>
                )}
              </span>
            </div>
          </div>

          <button
            className="icon-btn"
            title="Logout"
            onClick={handleLogout}
          >
            ➔
          </button>
        </div>
      </header>

      {/* Main 3-Column Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Left Sidebar Card */}
        <aside className="sidebar-card">
          <div className="menu-group">
            <button
              className={`menu-item ${activeTab === "ALL" ? "active" : ""}`}
              onClick={() => setActiveTab("ALL")}
            >
              <div className="menu-item-left">
                <span className="menu-item-icon">📁</span>
                <span>All Emails</span>
              </div>
              <span className="menu-item-badge">{emails.length}</span>
            </button>

            <button
              className={`menu-item ${activeTab === "SCHEDULED" ? "active" : ""}`}
              onClick={() => setActiveTab("SCHEDULED")}
            >
              <div className="menu-item-left">
                <span className="menu-item-icon">⏳</span>
                <span>Scheduled</span>
              </div>
              <span className="menu-item-badge">{scheduledCount}</span>
            </button>

            <button
              className={`menu-item ${activeTab === "SENT" ? "active" : ""}`}
              onClick={() => setActiveTab("SENT")}
            >
              <div className="menu-item-left">
                <span className="menu-item-icon">✅</span>
                <span>Sent History</span>
              </div>
              <span className="menu-item-badge">{sentCount}</span>
            </button>

            <button
              className={`menu-item ${activeTab === "FAILED" ? "active" : ""}`}
              onClick={() => setActiveTab("FAILED")}
            >
              <div className="menu-item-left">
                <span className="menu-item-icon">⚠️</span>
                <span>Failed</span>
              </div>
              <span className="menu-item-badge">{failedCount}</span>
            </button>

            <div className="menu-title">SETTINGS</div>
            <button className="menu-item">
              <div className="menu-item-left">
                <span className="menu-item-icon">⚙️</span>
                <span>Campaign Rules</span>
              </div>
            </button>
          </div>

          <div className="sidebar-bottom">
            <div className="storage-card">
              <div className="storage-header">
                <span>Hourly Limit</span>
                <span>{emails.length} / 200</span>
              </div>
              <div className="storage-progress">
                <div
                  className="storage-bar"
                  style={{
                    width: `${Math.min(100, (emails.length / 200) * 100)}%`,
                  }}
                ></div>
              </div>
              <div className="storage-sub">Delay: 2s • Capacity 200/hr</div>
            </div>
          </div>
        </aside>

        {/* Center Content Column */}
        <main className="center-content">
          {/* Quick Access Stats Cards */}
          <section className="quick-access-section">
            <div className="section-label">Quick Access</div>
            <div className="quick-cards-grid">
              <div className="quick-card" onClick={() => setActiveTab("ALL")}>
                <div className="quick-card-icon blue">📁</div>
                <div className="quick-card-info">
                  <span className="quick-card-title">Total Emails</span>
                  <span className="quick-card-meta">
                    {emails.length} items
                  </span>
                </div>
              </div>

              <div
                className="quick-card"
                onClick={() => setActiveTab("SCHEDULED")}
              >
                <div className="quick-card-icon sky">⏳</div>
                <div className="quick-card-info">
                  <span className="quick-card-title">Scheduled</span>
                  <span className="quick-card-meta">
                    {scheduledCount} items
                  </span>
                </div>
              </div>

              <div className="quick-card" onClick={() => setActiveTab("SENT")}>
                <div className="quick-card-icon emerald">✅</div>
                <div className="quick-card-info">
                  <span className="quick-card-title">Sent History</span>
                  <span className="quick-card-meta">{sentCount} items</span>
                </div>
              </div>

              <div
                className="quick-card"
                onClick={() => setActiveTab("FAILED")}
              >
                <div className="quick-card-icon rose">⚠️</div>
                <div className="quick-card-info">
                  <span className="quick-card-title">Failed</span>
                  <span className="quick-card-meta">{failedCount} items</span>
                </div>
              </div>
            </div>
          </section>

          {/* Main Table Workspace */}
          <section className="workspace-card">
            <div className="workspace-header">
              <div className="breadcrumbs">
                <span>Home</span>
                <span>›</span>
                <span>Campaigns</span>
                <span>›</span>
                <strong>Test Campaign</strong>
              </div>

              <div className="workspace-actions">
                <button
                  className="add-btn"
                  onClick={() => setShowScheduleModal(true)}
                >
                  <span>+</span>
                  <span>Schedule Email</span>
                </button>
              </div>
            </div>

            {message && (
              <div
                className={`message ${
                  message.includes("successfully") ? "success" : "error"
                }`}
                style={{ marginBottom: "16px" }}
              >
                {message}
              </div>
            )}

            <div className="table-container">
              {filteredEmails.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">✉️</div>
                  <h3>No emails found</h3>
                  <p>Click + Schedule Email above to schedule your first email.</p>
                </div>
              ) : (
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Recipient</th>
                      <th>Subject</th>
                      <th>Scheduled Date</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmails.map((email) => {
                      const isSelected = selectedEmail?.id === email.id;
                      return (
                        <tr
                          key={email.id}
                          className={isSelected ? "selected" : ""}
                          onClick={() => setSelectedEmail(email)}
                        >
                          <td>
                            <div className="recipient-cell">
                              <div className="cell-icon">✉️</div>
                              <span>{email.recipient}</span>
                            </div>
                          </td>
                          <td>{email.subject}</td>
                          <td>
                            {new Date(email.scheduledAt).toLocaleString()}
                          </td>
                          <td>
                            <span
                              className={`status-badge ${email.status.toLowerCase()}`}
                            >
                              <span className="status-dot"></span>
                              {email.status}
                            </span>
                          </td>
                          <td>
                            <button className="more-btn">⋮</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </main>

        {/* Right Side Inspector Panel */}
        <aside className="inspector-card">
          {selectedEmail ? (
            <>
              <div className="inspector-header">
                <div className="inspector-title-box">
                  <div className="inspector-icon">✉️</div>
                  <div>
                    <div className="inspector-title">
                      {selectedEmail.subject}
                    </div>
                    <div className="inspector-sub">
                      To: {selectedEmail.recipient}
                    </div>
                  </div>
                </div>
                <button
                  className="close-btn"
                  onClick={() => setSelectedEmail(null)}
                >
                  ✕
                </button>
              </div>

              <div className="inspector-tags">
                <span className="tag primary">{selectedEmail.status}</span>
                <span className="tag">Delay: 2s</span>
                <span className="tag">Limit: 200/hr</span>
              </div>

              <div className="inspector-nav">
                <button className="inspector-nav-btn active">Activity</button>
                <button className="inspector-nav-btn">Details</button>
              </div>

              <div className="timeline">
                <div className="timeline-item">
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <span className="timeline-time">
                      {new Date(selectedEmail.scheduledAt).toLocaleTimeString()}
                    </span>
                    <span className="timeline-text">Scheduled for Delivery</span>
                    <span className="timeline-subtext">
                      Target time: {new Date(selectedEmail.scheduledAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {selectedEmail.status === "SENT" && (
                  <div className="timeline-item">
                    <div
                      className="timeline-dot"
                      style={{ background: "#10b981", boxShadow: "0 0 0 4px #d1fae5" }}
                    ></div>
                    <div className="timeline-content">
                      <span className="timeline-time">
                        {selectedEmail.sentAt
                          ? new Date(selectedEmail.sentAt).toLocaleTimeString()
                          : "Delivered"}
                      </span>
                      <span className="timeline-text">
                        Delivered via Ethereal SMTP
                      </span>
                      <span className="timeline-subtext">
                        Message ID: {selectedEmail.messageId || "Generated"}
                      </span>
                    </div>
                  </div>
                )}

                {selectedEmail.status === "FAILED" && (
                  <div className="timeline-item">
                    <div
                      className="timeline-dot"
                      style={{ background: "#e11d48", boxShadow: "0 0 0 4px #ffe4e6" }}
                    ></div>
                    <div className="timeline-content">
                      <span className="timeline-time">Failed</span>
                      <span className="timeline-text">Execution Exhausted</span>
                      <span className="timeline-subtext">
                        Maximum 3 retries exceeded
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty" style={{ paddingTop: "100px" }}>
              <div className="empty-icon">👈</div>
              <h3>Select an email</h3>
              <p>Click any email row to view full activity and timeline logs.</p>
            </div>
          )}
        </aside>
      </div>

      {/* Schedule Email Modal Overlay */}
      {showScheduleModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Schedule New Email</h2>
              <button
                className="close-btn"
                onClick={() => setShowScheduleModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={scheduleEmail} className="modal-form">
              <label>
                Recipient Email
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  required
                />
              </label>

              <label>
                Subject Line
                <input
                  type="text"
                  placeholder="e.g. Follow-up regarding campaign"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </label>

              <label>
                Email Body
                <textarea
                  rows={4}
                  placeholder="Write your email body..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                />
              </label>

              <label>
                Scheduled Time
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                />
              </label>

              <button
                type="submit"
                className="submit-btn"
                disabled={loading}
              >
                {loading ? "Scheduling Email..." : "Schedule Email"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;