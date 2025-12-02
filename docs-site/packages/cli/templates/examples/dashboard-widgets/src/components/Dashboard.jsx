import StatsWidget from './widgets/StatsWidget';
import ChartWidget from './widgets/ChartWidget';
import './Dashboard.css';

function Dashboard() {
  return (
    <div className="dashboard-grid">
      <StatsWidget />
      <ChartWidget />
      {/* TODO: Add new widgets here */}
    </div>
  );
}

export default Dashboard;
