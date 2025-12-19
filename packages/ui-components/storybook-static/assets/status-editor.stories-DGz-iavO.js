import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as o}from"./index-DhY--VwN.js";import{S as B,a as G,b as H,c as J,d as Q}from"./select-DprUpgnz.js";import{c as C}from"./utils-CDN07tui.js";import{A as X}from"./archive-ClFtL5lN.js";import{C as Y,a as Z,b as $}from"./clock-psjzWXVS.js";import{L as ee}from"./index-D4jms2TP.js";import"./index-CE4oAmmT.js";import"./index-BoxsY6nR.js";import"./index-BG3m2RIl.js";import"./index-BnZ-dH4k.js";import"./chevron-down-DnSTBhOw.js";import"./createLucideIcon-CmAQLPQa.js";const te=["planned","in-progress","complete","archived"],ae={planned:{icon:$,label:"Planned",className:"bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"},"in-progress":{icon:Z,label:"In Progress",className:"bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"},complete:{icon:Y,label:"Complete",className:"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"},archived:{icon:X,label:"Archived",className:"bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"}};function u({currentStatus:a,onStatusChange:l,disabled:r=!1,config:s,className:U,ariaLabel:M="Change status"}){const[c,v]=o.useState(a),[h,w]=o.useState(!1),[x,b]=o.useState(null),y=o.useMemo(()=>{const t={...ae};if(s)for(const i in s){const n=i;t[n]={...t[n],...s[n]}}return t},[s]);o.useEffect(()=>{v(a)},[a]);const W=async t=>{if(t===c)return;const i=c;v(t),w(!0),b(null);try{await l(t)}catch(n){v(i);const z=n instanceof Error?n.message:"Failed to update";b(z),console.error("Status update failed:",n)}finally{w(!1)}},f=y[c],K=f.icon,O=f.label;return e.jsxs("div",{className:C("relative",U),children:[e.jsxs(B,{value:c,onValueChange:t=>W(t),disabled:r||h,children:[e.jsx(G,{className:C("h-7 w-fit min-w-[120px] border-0 px-2 text-xs font-medium",f.className,h&&"opacity-70"),"aria-label":M,children:e.jsxs("div",{className:"flex items-center gap-1.5",children:[h?e.jsx(ee,{className:"h-3.5 w-3.5 animate-spin"}):e.jsx(K,{className:"h-3.5 w-3.5"}),e.jsx(H,{children:O})]})}),e.jsx(J,{children:te.map(t=>{const i=y[t],n=i.icon;return e.jsx(Q,{value:t,className:"pl-2",children:e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(n,{className:"h-4 w-4"}),e.jsx("span",{children:i.label})]})},t)})})]}),x&&e.jsx("div",{className:"absolute top-full left-0 mt-1 text-xs text-destructive",children:x})]})}u.__docgenInfo={description:"",methods:[],displayName:"StatusEditor",props:{currentStatus:{required:!0,tsType:{name:"union",raw:"'planned' | 'in-progress' | 'complete' | 'archived'",elements:[{name:"literal",value:"'planned'"},{name:"literal",value:"'in-progress'"},{name:"literal",value:"'complete'"},{name:"literal",value:"'archived'"}]},description:""},onStatusChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(newStatus: SpecStatus) => Promise<void> | void",signature:{arguments:[{type:{name:"union",raw:"'planned' | 'in-progress' | 'complete' | 'archived'",elements:[{name:"literal",value:"'planned'"},{name:"literal",value:"'in-progress'"},{name:"literal",value:"'complete'"},{name:"literal",value:"'archived'"}]},name:"newStatus"}],return:{name:"union",raw:"Promise<void> | void",elements:[{name:"Promise",elements:[{name:"void"}],raw:"Promise<void>"},{name:"void"}]}}},description:""},disabled:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},config:{required:!1,tsType:{name:"Partial",elements:[{name:"Record",elements:[{name:"union",raw:"'planned' | 'in-progress' | 'complete' | 'archived'",elements:[{name:"literal",value:"'planned'"},{name:"literal",value:"'in-progress'"},{name:"literal",value:"'complete'"},{name:"literal",value:"'archived'"}]},{name:"Partial",elements:[{name:"StatusConfig"}],raw:"Partial<StatusConfig>"}],raw:"Record<SpecStatus, Partial<StatusConfig>>"}],raw:"Partial<Record<SpecStatus, Partial<StatusConfig>>>"},description:""},className:{required:!1,tsType:{name:"string"},description:""},ariaLabel:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'Change status'",computed:!1}}}};const ve={title:"Components/Spec/StatusEditor",component:u,parameters:{layout:"centered"},tags:["autodocs"]},m={render:()=>{const[a,l]=o.useState("planned");return e.jsx(u,{currentStatus:a,onStatusChange:async r=>{await new Promise(s=>setTimeout(s,500)),l(r)}})}},d={render:()=>{const[a,l]=o.useState("in-progress");return e.jsx(u,{currentStatus:a,onStatusChange:async r=>{await new Promise(s=>setTimeout(s,500)),l(r)}})}},p={render:()=>{const[a,l]=o.useState("complete");return e.jsx(u,{currentStatus:a,onStatusChange:async r=>{await new Promise(s=>setTimeout(s,500)),l(r)}})}},S={args:{currentStatus:"planned",onStatusChange:async()=>{},disabled:!0}},g={render:()=>{const[a,l]=o.useState("planned");return e.jsx(u,{currentStatus:a,onStatusChange:async()=>{throw await new Promise(r=>setTimeout(r,500)),new Error("Failed to update status")}})}};var P,j,E;m.parameters={...m.parameters,docs:{...(P=m.parameters)==null?void 0:P.docs,source:{originalSource:`{
  render: () => {
    const [status, setStatus] = useState<'planned' | 'in-progress' | 'complete' | 'archived'>('planned');
    return <StatusEditor currentStatus={status} onStatusChange={async newStatus => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setStatus(newStatus);
    }} />;
  }
}`,...(E=(j=m.parameters)==null?void 0:j.docs)==null?void 0:E.source}}};var T,N,k;d.parameters={...d.parameters,docs:{...(T=d.parameters)==null?void 0:T.docs,source:{originalSource:`{
  render: () => {
    const [status, setStatus] = useState<'planned' | 'in-progress' | 'complete' | 'archived'>('in-progress');
    return <StatusEditor currentStatus={status} onStatusChange={async newStatus => {
      await new Promise(resolve => setTimeout(resolve, 500));
      setStatus(newStatus);
    }} />;
  }
}`,...(k=(N=d.parameters)==null?void 0:N.docs)==null?void 0:k.source}}};var I,q,A;p.parameters={...p.parameters,docs:{...(I=p.parameters)==null?void 0:I.docs,source:{originalSource:`{
  render: () => {
    const [status, setStatus] = useState<'planned' | 'in-progress' | 'complete' | 'archived'>('complete');
    return <StatusEditor currentStatus={status} onStatusChange={async newStatus => {
      await new Promise(resolve => setTimeout(resolve, 500));
      setStatus(newStatus);
    }} />;
  }
}`,...(A=(q=p.parameters)==null?void 0:q.docs)==null?void 0:A.source}}};var D,R,V;S.parameters={...S.parameters,docs:{...(D=S.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    currentStatus: 'planned',
    onStatusChange: async () => {},
    disabled: true
  }
}`,...(V=(R=S.parameters)==null?void 0:R.docs)==null?void 0:V.source}}};var _,F,L;g.parameters={...g.parameters,docs:{...(_=g.parameters)==null?void 0:_.docs,source:{originalSource:`{
  render: () => {
    const [status, setStatus] = useState<'planned' | 'in-progress' | 'complete' | 'archived'>('planned');
    return <StatusEditor currentStatus={status} onStatusChange={async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      throw new Error('Failed to update status');
    }} />;
  }
}`,...(L=(F=g.parameters)==null?void 0:F.docs)==null?void 0:L.source}}};const he=["Default","InProgress","Complete","Disabled","WithError"];export{p as Complete,m as Default,S as Disabled,d as InProgress,g as WithError,he as __namedExportsOrder,ve as default};
