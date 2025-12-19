import{j as r}from"./jsx-runtime-D_zvdyIk.js";import{a as z,f as G}from"./date-utils-BGj35H3S.js";import{c as i}from"./utils-CDN07tui.js";import{b as H,a as J,C as K}from"./clock-psjzWXVS.js";import{c as M}from"./createLucideIcon-CmAQLPQa.js";import{A as X}from"./archive-ClFtL5lN.js";import"./index-DhY--VwN.js";/**
 * @license lucide-react v0.553.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]],k=M("circle",Y),q={created:"Created",inProgress:"In Progress",complete:"Complete",archived:"Archived",awaiting:"Awaiting",queued:"Queued",pending:"Pending"};function W({createdAt:f,updatedAt:A,completedAt:B,status:a,className:O,labels:U=q,language:y="en"}){const s={...q,...U},t=[];return f&&t.push({label:s.created,date:f,isActive:!0,isFuture:!1,icon:H,color:"text-blue-600"}),a==="in-progress"||a==="complete"||a==="archived"?t.push({label:s.inProgress,date:A||f,isActive:!0,isFuture:!1,icon:J,color:"text-orange-600"}):t.push({label:s.inProgress,date:null,isActive:!1,isFuture:!0,icon:k,color:"text-muted-foreground"}),a==="complete"||a==="archived"?t.push({label:s.complete,date:B||A,isActive:!0,isFuture:!1,icon:K,color:"text-green-600"}):t.push({label:s.complete,date:null,isActive:!1,isFuture:!0,icon:k,color:"text-muted-foreground"}),a==="archived"&&t.push({label:s.archived,date:A,isActive:!0,isFuture:!1,icon:X,color:"text-gray-600"}),t.length===0?null:r.jsx("div",{className:i("flex items-start gap-2",O),children:t.map((e,h)=>{const w=e.icon,b=h===t.length-1,n=b?null:t[h+1],v=e.date&&(n!=null&&n.date)&&!n.isFuture?z(e.date,n.date,y):"";return r.jsxs("div",{className:"flex items-center gap-2 flex-1",children:[r.jsxs("div",{className:"flex flex-col items-center gap-1 min-w-0",children:[r.jsx("div",{className:i("w-8 h-8 rounded-full border-2 bg-background flex items-center justify-center shrink-0",e.isActive&&!e.isFuture?"border-primary":"border-muted-foreground/40"),children:w&&r.jsx(w,{className:i("h-4 w-4",e.isActive&&!e.isFuture?"text-primary":"text-muted-foreground/60")})}),r.jsx("div",{className:i("text-xs font-medium text-center whitespace-nowrap",e.isActive&&!e.isFuture?"text-foreground":"text-muted-foreground"),children:e.label}),r.jsxs("div",{className:"text-[10px] text-center min-h-[14px]",children:[e.date&&!e.isFuture&&r.jsx("span",{className:"text-muted-foreground",children:G(e.date,y)}),!e.date&&e.isFuture&&r.jsx("span",{className:"text-muted-foreground/70",children:s.awaiting}),e.date&&e.isFuture&&r.jsx("span",{className:"text-muted-foreground/70",children:s.queued}),!e.date&&!e.isFuture&&r.jsx("span",{className:"text-muted-foreground/60",children:s.pending})]})]}),!b&&r.jsxs("div",{className:"flex flex-col items-center flex-1 min-w-4 gap-0.5",children:[r.jsx("div",{className:i("h-0.5 w-full",e.isActive&&!e.isFuture?"bg-primary":"bg-muted-foreground/40")}),v&&r.jsx("div",{className:"text-[10px] text-muted-foreground font-medium whitespace-nowrap",children:v})]})]},h)})})}W.__docgenInfo={description:"",methods:[],displayName:"SpecTimeline",props:{createdAt:{required:!0,tsType:{name:"union",raw:"Date | string | number | null | undefined",elements:[{name:"Date"},{name:"string"},{name:"number"},{name:"null"},{name:"undefined"}]},description:""},updatedAt:{required:!0,tsType:{name:"union",raw:"Date | string | number | null | undefined",elements:[{name:"Date"},{name:"string"},{name:"number"},{name:"null"},{name:"undefined"}]},description:""},completedAt:{required:!1,tsType:{name:"union",raw:"Date | string | number | null | undefined",elements:[{name:"Date"},{name:"string"},{name:"number"},{name:"null"},{name:"undefined"}]},description:""},status:{required:!0,tsType:{name:"string"},description:""},className:{required:!1,tsType:{name:"string"},description:""},labels:{required:!1,tsType:{name:"signature",type:"object",raw:`{
  created?: string;
  inProgress?: string;
  complete?: string;
  archived?: string;
  awaiting?: string;
  queued?: string;
  pending?: string;
}`,signature:{properties:[{key:"created",value:{name:"string",required:!1}},{key:"inProgress",value:{name:"string",required:!1}},{key:"complete",value:{name:"string",required:!1}},{key:"archived",value:{name:"string",required:!1}},{key:"awaiting",value:{name:"string",required:!1}},{key:"queued",value:{name:"string",required:!1}},{key:"pending",value:{name:"string",required:!1}}]}},description:"",defaultValue:{value:`{
  created: 'Created',
  inProgress: 'In Progress',
  complete: 'Complete',
  archived: 'Archived',
  awaiting: 'Awaiting',
  queued: 'Queued',
  pending: 'Pending',
}`,computed:!1}},language:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'en'",computed:!1}}}};const ne={title:"Components/Spec/SpecTimeline",component:W,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{status:{control:"select",options:["planned","in-progress","complete","archived"]}}},p=new Date,o=new Date(p.getTime()-1440*60*1e3),g=new Date(p.getTime()-10080*60*1e3),x=new Date(p.getTime()-720*60*60*1e3),d={args:{createdAt:o,updatedAt:o,status:"planned"}},c={args:{createdAt:g,updatedAt:o,status:"in-progress"}},u={args:{createdAt:x,updatedAt:g,completedAt:o,status:"complete"}},l={args:{createdAt:x,updatedAt:g,completedAt:new Date(p.getTime()-4320*60*1e3),status:"archived"}},m={args:{createdAt:x,updatedAt:g,completedAt:o,status:"complete",labels:{created:"Started",inProgress:"Working",complete:"Done",archived:"Archived"}}};var j,T,N;d.parameters={...d.parameters,docs:{...(j=d.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    createdAt: yesterday,
    updatedAt: yesterday,
    status: 'planned'
  }
}`,...(N=(T=d.parameters)==null?void 0:T.docs)==null?void 0:N.source}}};var P,D,F;c.parameters={...c.parameters,docs:{...(P=c.parameters)==null?void 0:P.docs,source:{originalSource:`{
  args: {
    createdAt: weekAgo,
    updatedAt: yesterday,
    status: 'in-progress'
  }
}`,...(F=(D=c.parameters)==null?void 0:D.docs)==null?void 0:F.source}}};var C,S,L;u.parameters={...u.parameters,docs:{...(C=u.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    createdAt: monthAgo,
    updatedAt: weekAgo,
    completedAt: yesterday,
    status: 'complete'
  }
}`,...(L=(S=u.parameters)==null?void 0:S.docs)==null?void 0:L.source}}};var I,_,E;l.parameters={...l.parameters,docs:{...(I=l.parameters)==null?void 0:I.docs,source:{originalSource:`{
  args: {
    createdAt: monthAgo,
    updatedAt: weekAgo,
    completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    status: 'archived'
  }
}`,...(E=(_=l.parameters)==null?void 0:_.docs)==null?void 0:E.source}}};var Q,R,V;m.parameters={...m.parameters,docs:{...(Q=m.parameters)==null?void 0:Q.docs,source:{originalSource:`{
  args: {
    createdAt: monthAgo,
    updatedAt: weekAgo,
    completedAt: yesterday,
    status: 'complete',
    labels: {
      created: 'Started',
      inProgress: 'Working',
      complete: 'Done',
      archived: 'Archived'
    }
  }
}`,...(V=(R=m.parameters)==null?void 0:R.docs)==null?void 0:V.source}}};const ie=["Planned","InProgress","Complete","Archived","CustomLabels"];export{l as Archived,u as Complete,m as CustomLabels,c as InProgress,d as Planned,ie as __namedExportsOrder,ne as default};
