import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{S as t}from"./stats-card-DBFcdtGe.js";import{F as w}from"./file-text-Di0opSds.js";import{C as i,a as N,b as V}from"./clock-psjzWXVS.js";import"./card-D9kVXokR.js";import"./index-DhY--VwN.js";import"./utils-CDN07tui.js";import"./createLucideIcon-CmAQLPQa.js";import"./minus-B91E08-W.js";const R={title:"Stats/StatsCard",component:t,parameters:{layout:"centered"},tags:["autodocs"],decorators:[A=>e.jsx("div",{className:"w-[250px]",children:e.jsx(A,{})})]},r={args:{title:"Total Specs",value:42,subtitle:"All specifications",icon:w,iconColorClass:"text-blue-600",gradientClass:"from-blue-500/10"}},s={args:{title:"Completed",value:28,subtitle:"67% completion rate",icon:i,iconColorClass:"text-green-600",gradientClass:"from-green-500/10",trend:"up",trendValue:"+12%"}},a={args:{title:"In Progress",value:8,icon:N,iconColorClass:"text-orange-600",gradientClass:"from-orange-500/10",trend:"down",trendValue:"-3"}},o={args:{title:"Planned",value:6,subtitle:"Not yet started",icon:V,iconColorClass:"text-blue-600",gradientClass:"from-blue-500/10"}},l={args:{title:"Status",value:"On Track",subtitle:"Project is progressing well",icon:i,iconColorClass:"text-green-600",gradientClass:"from-green-500/10"}},n={decorators:[()=>e.jsxs("div",{className:"grid grid-cols-2 lg:grid-cols-4 gap-4 w-[800px]",children:[e.jsx(t,{title:"Total Specs",value:42,subtitle:"All specifications",icon:w,iconColorClass:"text-blue-600",gradientClass:"from-blue-500/10"}),e.jsx(t,{title:"Completed",value:28,subtitle:"67% completion rate",icon:i,iconColorClass:"text-green-600",gradientClass:"from-green-500/10"}),e.jsx(t,{title:"In Progress",value:8,subtitle:"Currently active",icon:N,iconColorClass:"text-orange-600",gradientClass:"from-orange-500/10"}),e.jsx(t,{title:"Planned",value:6,subtitle:"Not yet started",icon:V,iconColorClass:"text-blue-600",gradientClass:"from-blue-500/10"})]})]};var c,d,u;r.parameters={...r.parameters,docs:{...(c=r.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    title: 'Total Specs',
    value: 42,
    subtitle: 'All specifications',
    icon: FileText,
    iconColorClass: 'text-blue-600',
    gradientClass: 'from-blue-500/10'
  }
}`,...(u=(d=r.parameters)==null?void 0:d.docs)==null?void 0:u.source}}};var C,g,m;s.parameters={...s.parameters,docs:{...(C=s.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    title: 'Completed',
    value: 28,
    subtitle: '67% completion rate',
    icon: CheckCircle2,
    iconColorClass: 'text-green-600',
    gradientClass: 'from-green-500/10',
    trend: 'up',
    trendValue: '+12%'
  }
}`,...(m=(g=s.parameters)==null?void 0:g.docs)==null?void 0:m.source}}};var p,x,b;a.parameters={...a.parameters,docs:{...(p=a.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    title: 'In Progress',
    value: 8,
    icon: PlayCircle,
    iconColorClass: 'text-orange-600',
    gradientClass: 'from-orange-500/10',
    trend: 'down',
    trendValue: '-3'
  }
}`,...(b=(x=a.parameters)==null?void 0:x.docs)==null?void 0:b.source}}};var f,v,S;o.parameters={...o.parameters,docs:{...(f=o.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    title: 'Planned',
    value: 6,
    subtitle: 'Not yet started',
    icon: Clock,
    iconColorClass: 'text-blue-600',
    gradientClass: 'from-blue-500/10'
  }
}`,...(S=(v=o.parameters)==null?void 0:v.docs)==null?void 0:S.source}}};var P,T,j;l.parameters={...l.parameters,docs:{...(P=l.parameters)==null?void 0:P.docs,source:{originalSource:`{
  args: {
    title: 'Status',
    value: 'On Track',
    subtitle: 'Project is progressing well',
    icon: CheckCircle2,
    iconColorClass: 'text-green-600',
    gradientClass: 'from-green-500/10'
  }
}`,...(j=(T=l.parameters)==null?void 0:T.docs)==null?void 0:j.source}}};var h,y,k;n.parameters={...n.parameters,docs:{...(h=n.parameters)==null?void 0:h.docs,source:{originalSource:`{
  decorators: [() => <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-[800px]">
        <StatsCard title="Total Specs" value={42} subtitle="All specifications" icon={FileText} iconColorClass="text-blue-600" gradientClass="from-blue-500/10" />
        <StatsCard title="Completed" value={28} subtitle="67% completion rate" icon={CheckCircle2} iconColorClass="text-green-600" gradientClass="from-green-500/10" />
        <StatsCard title="In Progress" value={8} subtitle="Currently active" icon={PlayCircle} iconColorClass="text-orange-600" gradientClass="from-orange-500/10" />
        <StatsCard title="Planned" value={6} subtitle="Not yet started" icon={Clock} iconColorClass="text-blue-600" gradientClass="from-blue-500/10" />
      </div>]
}`,...(k=(y=n.parameters)==null?void 0:y.docs)==null?void 0:k.source}}};const q=["Default","WithTrendUp","WithTrendDown","Planned","StringValue","Grid"];export{r as Default,n as Grid,o as Planned,l as StringValue,a as WithTrendDown,s as WithTrendUp,q as __namedExportsOrder,R as default};
