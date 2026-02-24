import '../styles/Home.css';

function Home() {
    return (
        <main className="home-container">
            <div className="title-section">
                <h1>You make the tasks, we manage the schedule</h1>
                <p className="subtitle">Stay organized, stay productive. Manage your tasks and calendar in one place.</p>
                <button className="cta-button">Get Started</button>
            </div>

            <div className="task-features">
                <h2>Task Management</h2>
                <p>Organize your work with powerful task management tools. Create, prioritize, and track your tasks effortlessly.</p>
                <div className="features-grid">
                    <div className="feature-card">
                        <h3>Organize Tasks</h3>
                        <p>Create and categorize tasks by project, priority, and deadline to keep everything in one place.</p>
                    </div>
                    <div className="feature-card">
                        <h3>Set Priorities</h3>
                        <p>Mark tasks as Low, Medium, High, or Urgent to focus on what matters most.</p>
                    </div>
                    <div className="feature-card">
                        <h3>Track Progress</h3>
                        <p>Monitor your task completion and stay on top of your workload with real-time updates.</p>
                    </div>
                </div>
            </div>

            <div className="calendar-features">
                <h2>Calendar Integration</h2>
                <p>Visualize your tasks and deadlines on an interactive calendar.</p>
                <div className="features-grid">
                    <div className="feature-card">
                        <h3>Visual Planning</h3>
                        <p>See all your tasks and deadlines at a glance with our intuitive calendar view.</p>
                    </div>
                    <div className="feature-card">
                        <h3>Automated Task Scheduling</h3>
                        <p>Let us manage your time for you. Give us your working yours and we find the time for you to work.</p>
                    </div>
                    <div className="feature-card">
                        <h3>Schedule Management</h3>
                        <p>Organize your schedule and balance your workload across the week or month.</p>
                    </div>
                </div>
            </div>
        </main>
    )
}

export default Home