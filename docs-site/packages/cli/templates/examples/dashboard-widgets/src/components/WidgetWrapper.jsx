import './WidgetWrapper.css';

function WidgetWrapper({ title, children }) {
  return (
    <div className="widget">
      <div className="widget-header">
        <h3>{title}</h3>
      </div>
      <div className="widget-body">
        {children}
      </div>
    </div>
  );
}

export default WidgetWrapper;
