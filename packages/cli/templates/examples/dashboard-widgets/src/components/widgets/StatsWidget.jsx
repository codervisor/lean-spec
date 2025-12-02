import WidgetWrapper from '../WidgetWrapper';
import { getStats } from '../../utils/mockData';
import './StatsWidget.css';

function StatsWidget() {
  const stats = getStats();
  
  return (
    <WidgetWrapper title="Quick Stats">
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-item">
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}

export default StatsWidget;
