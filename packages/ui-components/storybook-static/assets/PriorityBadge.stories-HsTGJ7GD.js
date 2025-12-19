import{j as r}from"./jsx-runtime-D_zvdyIk.js";import{P as o}from"./priority-badge-CCc6gs4r.js";import"./badge-BcO251Zn.js";import"./index-C2vczdB5.js";import"./utils-CDN07tui.js";import"./circle-alert-C6t9kq2b.js";import"./createLucideIcon-CmAQLPQa.js";import"./index-DhY--VwN.js";import"./minus-B91E08-W.js";import"./arrow-up-CxjmGgh_.js";const z={title:"Spec/PriorityBadge",component:o,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{priority:{control:"select",options:["low","medium","high","critical"]},iconOnly:{control:"boolean"}}},i={args:{priority:"low"}},e={args:{priority:"medium"}},a={args:{priority:"high"}},s={args:{priority:"critical"}},t={args:{priority:"high",iconOnly:!0}},c={args:{priority:"critical",label:"紧急"}},n={render:()=>r.jsxs("div",{className:"flex flex-col gap-2",children:[r.jsx(o,{priority:"low"}),r.jsx(o,{priority:"medium"}),r.jsx(o,{priority:"high"}),r.jsx(o,{priority:"critical"})]})};var p,m,l;i.parameters={...i.parameters,docs:{...(p=i.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    priority: 'low'
  }
}`,...(l=(m=i.parameters)==null?void 0:m.docs)==null?void 0:l.source}}};var d,g,u;e.parameters={...e.parameters,docs:{...(d=e.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    priority: 'medium'
  }
}`,...(u=(g=e.parameters)==null?void 0:g.docs)==null?void 0:u.source}}};var y,h,x;a.parameters={...a.parameters,docs:{...(y=a.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    priority: 'high'
  }
}`,...(x=(h=a.parameters)==null?void 0:h.docs)==null?void 0:x.source}}};var P,S,f;s.parameters={...s.parameters,docs:{...(P=s.parameters)==null?void 0:P.docs,source:{originalSource:`{
  args: {
    priority: 'critical'
  }
}`,...(f=(S=s.parameters)==null?void 0:S.docs)==null?void 0:f.source}}};var j,w,B;t.parameters={...t.parameters,docs:{...(j=t.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    priority: 'high',
    iconOnly: true
  }
}`,...(B=(w=t.parameters)==null?void 0:w.docs)==null?void 0:B.source}}};var O,b,C;c.parameters={...c.parameters,docs:{...(O=c.parameters)==null?void 0:O.docs,source:{originalSource:`{
  args: {
    priority: 'critical',
    label: '紧急'
  }
}`,...(C=(b=c.parameters)==null?void 0:b.docs)==null?void 0:C.source}}};var L,v,A;n.parameters={...n.parameters,docs:{...(L=n.parameters)==null?void 0:L.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-2">
      <PriorityBadge priority="low" />
      <PriorityBadge priority="medium" />
      <PriorityBadge priority="high" />
      <PriorityBadge priority="critical" />
    </div>
}`,...(A=(v=n.parameters)==null?void 0:v.docs)==null?void 0:A.source}}};const D=["Low","Medium","High","Critical","IconOnly","CustomLabel","AllPriorities"];export{n as AllPriorities,s as Critical,c as CustomLabel,a as High,t as IconOnly,i as Low,e as Medium,D as __namedExportsOrder,z as default};
