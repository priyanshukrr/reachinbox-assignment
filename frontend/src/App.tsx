import { useState } from "react";
import "./App.css";

type EmailStatus = "SCHEDULED" | "PROCESSING" | "SENT" | "FAILED";

interface Email {
  id: string;
  recipient: string;
  subject: string;
  scheduledAt: string;
  status: EmailStatus;
}

const API_URL = "http://localhost:5000";

const USER_ID = "19059d97-8a63-4a77-a7c9-0718b5eafc91";
const CAMPAIGN_ID = "caedb0aa-c32d-4992-8f95-24aeac5305b2";

function App() {
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const scheduleEmail = async () => {
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
          userId: USER_ID,
          campaignId: CAMPAIGN_ID,
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

      const email = data.email;

      setEmails((prev) => [
        {
          id: email.id,
          recipient: email.recipient,
          subject: email.subject,
          scheduledAt: email.scheduledAt,
          status: email.status,
        },
        ...prev,
      ]);

      setRecipient("");
      setSubject("");
      setBody("");
      setScheduledAt("");

      setMessage("Email scheduled successfully!");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  const scheduled = emails.filter(
    (email) => email.status === "SCHEDULED"
  ).length;

  const sent = emails.filter((email) => email.status === "SENT").length;

  const failed = emails.filter(
    (email) => email.status === "FAILED"
  ).length;

  return (
    <div className="app">
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">R</div>
          <span>ReachInbox</span>
        </div>

        <div className="nav-right">
          <span>Dashboard</span>
          <div className="avatar">P</div>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <div>
            <p className="eyebrow">EMAIL AUTOMATION</p>
            <h1>Campaign Dashboard</h1>
            <p className="subtitle">
              Schedule, manage and monitor your email campaigns.
            </p>
          </div>
        </section>

        <section className="stats">
          <div className="stat-card">
            <span>Total Emails</span>
            <strong>{emails.length}</strong>
          </div>

          <div className="stat-card">
            <span>Scheduled</span>
            <strong>{scheduled}</strong>
          </div>

          <div className="stat-card">
            <span>Sent</span>
            <strong>{sent}</strong>
          </div>

          <div className="stat-card">
            <span>Failed</span>
            <strong>{failed}</strong>
          </div>
        </section>

        <section className="content-grid">
          <div className="card compose-card">
            <div className="card-header">
              <div>
                <h2>Schedule Email</h2>
                <p>Create a new scheduled email.</p>
              </div>
            </div>

            <div className="form">
              <label>
                Recipient
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </label>

              <label>
                Subject
                <input
                  type="text"
                  placeholder="Email subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </label>

              <label>
                Message
                <textarea
                  placeholder="Write your email..."
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </label>

              <label>
                Schedule Time
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </label>

              <button
                className="schedule-btn"
                onClick={scheduleEmail}
                disabled={loading}
              >
                {loading ? "Scheduling..." : "Schedule Email"}
              </button>

              {message && (
                <div
                  className={
                    message.includes("successfully")
                      ? "message success"
                      : "message error"
                  }
                >
                  {message}
                </div>
              )}
            </div>
          </div>

          <div className="card info-card">
            <h2>Campaign Settings</h2>

            <div className="setting">
              <span>Campaign</span>
              <strong>Test Campaign</strong>
            </div>

            <div className="setting">
              <span>Email Delay</span>
              <strong>2 seconds</strong>
            </div>

            <div className="setting">
              <span>Hourly Limit</span>
              <strong>200 emails</strong>
            </div>

            <div className="worker-status">
              <span className="dot"></span>
              Worker Active
            </div>
          </div>
        </section>

        <section className="card table-card">
          <div className="card-header">
            <div>
              <h2>Scheduled Emails</h2>
              <p>Recent emails from this session.</p>
            </div>
          </div>

          {emails.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">✉</div>
              <h3>No emails scheduled</h3>
              <p>
                Schedule your first email using the form above.
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Subject</th>
                    <th>Scheduled</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {emails.map((email) => (
                    <tr key={email.id}>
                      <td>{email.recipient}</td>
                      <td>{email.subject}</td>
                      <td>
                        {new Date(email.scheduledAt).toLocaleString()}
                      </td>
                      <td>
                        <span
                          className={`status ${email.status.toLowerCase()}`}
                        >
                          {email.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;