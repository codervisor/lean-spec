import{j as s}from"./jsx-runtime-D_zvdyIk.js";import{S as e}from"./status-badge-COinvKLP.js";import"./badge-BcO251Zn.js";import"./index-C2vczdB5.js";import"./utils-CDN07tui.js";import"./archive-ClFtL5lN.js";import"./createLucideIcon-CmAQLPQa.js";import"./index-DhY--VwN.js";import"./clock-psjzWXVS.js";const D={title:"Spec/StatusBadge",component:e,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{status:{control:"select",options:["planned","in-progress","complete","archived"]},iconOnly:{control:"boolean"}}},r={args:{status:"planned"}},a={args:{status:"in-progress"}},t={args:{status:"complete"}},o={args:{status:"archived"}},n={args:{status:"in-progress",iconOnly:!0}},c={args:{status:"planned",label:"待处理"}},p={render:()=>s.jsxs("div",{className:"flex flex-col gap-2",children:[s.jsx(e,{status:"planned"}),s.jsx(e,{status:"in-progress"}),s.jsx(e,{status:"complete"}),s.jsx(e,{status:"archived"})]})};var u,m,d;r.parameters={...r.parameters,docs:{...(u=r.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    status: 'planned'
  }
}`,...(d=(m=r.parameters)==null?void 0:m.docs)==null?void 0:d.source}}};var l,i,g;a.parameters={...a.parameters,docs:{...(l=a.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    status: 'in-progress'
  }
}`,...(g=(i=a.parameters)==null?void 0:i.docs)==null?void 0:g.source}}};var S,x,v;t.parameters={...t.parameters,docs:{...(S=t.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    status: 'complete'
  }
}`,...(v=(x=t.parameters)==null?void 0:x.docs)==null?void 0:v.source}}};var h,f,j;o.parameters={...o.parameters,docs:{...(h=o.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    status: 'archived'
  }
}`,...(j=(f=o.parameters)==null?void 0:f.docs)==null?void 0:j.source}}};var y,B,O;n.parameters={...n.parameters,docs:{...(y=n.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    status: 'in-progress',
    iconOnly: true
  }
}`,...(O=(B=n.parameters)==null?void 0:B.docs)==null?void 0:O.source}}};var b,A,C;c.parameters={...c.parameters,docs:{...(b=c.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    status: 'planned',
    label: '待处理'
  }
}`,...(C=(A=c.parameters)==null?void 0:A.docs)==null?void 0:C.source}}};var I,P,E;p.parameters={...p.parameters,docs:{...(I=p.parameters)==null?void 0:I.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-2">
      <StatusBadge status="planned" />
      <StatusBadge status="in-progress" />
      <StatusBadge status="complete" />
      <StatusBadge status="archived" />
    </div>
}`,...(E=(P=p.parameters)==null?void 0:P.docs)==null?void 0:E.source}}};const F=["Planned","InProgress","Complete","Archived","IconOnly","CustomLabel","AllStatuses"];export{p as AllStatuses,o as Archived,t as Complete,c as CustomLabel,n as IconOnly,a as InProgress,r as Planned,F as __namedExportsOrder,D as default};
