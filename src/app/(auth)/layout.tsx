import "@/styles/auth.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-root">
      <div className="container">
        {/* Left Side */}
        <div className="welcome-section">
          <div className="logo">
            <span>♥</span>
            DiabetesCare
          </div>

          <div className="welcome-content">
            <h1>Manage Your Diabetes With Confidence</h1>

            <p>Monitor your health, track your blood glucose, medications, diet, and appointments in one place.</p>

            <div className="features">
              <div>✓ Blood glucose monitoring</div>
              <div>✓ Medication tracking</div>
              <div>✓ Health reports</div>
              <div>✓ Appointment reminders</div>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="form-section">{children}</div>
      </div>
    </div>
  );
}
