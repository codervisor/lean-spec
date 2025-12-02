import WidgetWrapper from '../WidgetWrapper';
import { getChartData } from '../../utils/mockData';
import './ChartWidget.css';

function ChartWidget() {
  const data = getChartData();
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <WidgetWrapper title="Activity Trend">
      <div className="chart">
        <div className="chart-bars">
          {data.map((item, index) => (
            <div key={index} className="chart-bar-container">
              <div 
                className="chart-bar"
                style={{ height: `${(item.value / maxValue) * 100}%` }}
              />
              <div className="chart-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </WidgetWrapper>
  );
}

export default ChartWidget;
