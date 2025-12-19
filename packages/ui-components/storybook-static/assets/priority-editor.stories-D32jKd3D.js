import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as n}from"./index-DhY--VwN.js";import{S as z,a as B,b as G,c as J,d as Q}from"./select-DprUpgnz.js";import{c as S}from"./utils-CDN07tui.js";import{A as X,C as Y}from"./circle-alert-C6t9kq2b.js";import{M as Z}from"./minus-B91E08-W.js";import{A as $}from"./arrow-up-CxjmGgh_.js";import{L as ee}from"./index-D4jms2TP.js";import"./index-CE4oAmmT.js";import"./index-BoxsY6nR.js";import"./index-BG3m2RIl.js";import"./index-BnZ-dH4k.js";import"./chevron-down-DnSTBhOw.js";import"./createLucideIcon-CmAQLPQa.js";const re=["low","medium","high","critical"],ie={critical:{icon:Y,label:"Critical",className:"bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"},high:{icon:$,label:"High",className:"bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"},medium:{icon:Z,label:"Medium",className:"bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"},low:{icon:X,label:"Low",className:"bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"}};function c({currentPriority:i,onPriorityChange:s,disabled:a=!1,config:t,className:F,ariaLabel:H="Change priority"}){const[m,P]=n.useState(i),[h,f]=n.useState(!1),[x,v]=n.useState(null),b=n.useMemo(()=>{const r={...ie};if(t)for(const l in t){const o=l;r[o]={...r[o],...t[o]}}return r},[t]);n.useEffect(()=>{P(i)},[i]);const U=async r=>{if(r===m)return;const l=m;P(r),f(!0),v(null);try{await s(r)}catch(o){P(l);const K=o instanceof Error?o.message:"Failed to update";v(K),console.error("Priority update failed:",o)}finally{f(!1)}},w=b[m],O=w.icon,W=w.label;return e.jsxs("div",{className:S("relative",F),children:[e.jsxs(z,{value:m,onValueChange:r=>U(r),disabled:a||h,children:[e.jsx(B,{className:S("h-7 w-fit min-w-[100px] border-0 px-2 text-xs font-medium",w.className,h&&"opacity-70"),"aria-label":H,children:e.jsxs("div",{className:"flex items-center gap-1.5",children:[h?e.jsx(ee,{className:"h-3.5 w-3.5 animate-spin"}):e.jsx(O,{className:"h-3.5 w-3.5"}),e.jsx(G,{children:W})]})}),e.jsx(J,{children:re.map(r=>{const l=b[r],o=l.icon;return e.jsx(Q,{value:r,className:"pl-2",children:e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(o,{className:"h-4 w-4"}),e.jsx("span",{children:l.label})]})},r)})})]}),x&&e.jsx("div",{className:"absolute top-full left-0 mt-1 text-xs text-destructive",children:x})]})}c.__docgenInfo={description:"",methods:[],displayName:"PriorityEditor",props:{currentPriority:{required:!0,tsType:{name:"union",raw:"'low' | 'medium' | 'high' | 'critical'",elements:[{name:"literal",value:"'low'"},{name:"literal",value:"'medium'"},{name:"literal",value:"'high'"},{name:"literal",value:"'critical'"}]},description:""},onPriorityChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(newPriority: SpecPriority) => Promise<void> | void",signature:{arguments:[{type:{name:"union",raw:"'low' | 'medium' | 'high' | 'critical'",elements:[{name:"literal",value:"'low'"},{name:"literal",value:"'medium'"},{name:"literal",value:"'high'"},{name:"literal",value:"'critical'"}]},name:"newPriority"}],return:{name:"union",raw:"Promise<void> | void",elements:[{name:"Promise",elements:[{name:"void"}],raw:"Promise<void>"},{name:"void"}]}}},description:""},disabled:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},config:{required:!1,tsType:{name:"Partial",elements:[{name:"Record",elements:[{name:"union",raw:"'low' | 'medium' | 'high' | 'critical'",elements:[{name:"literal",value:"'low'"},{name:"literal",value:"'medium'"},{name:"literal",value:"'high'"},{name:"literal",value:"'critical'"}]},{name:"Partial",elements:[{name:"PriorityConfig"}],raw:"Partial<PriorityConfig>"}],raw:"Record<SpecPriority, Partial<PriorityConfig>>"}],raw:"Partial<Record<SpecPriority, Partial<PriorityConfig>>>"},description:""},className:{required:!1,tsType:{name:"string"},description:""},ariaLabel:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'Change priority'",computed:!1}}}};const he={title:"Components/Spec/PriorityEditor",component:c,parameters:{layout:"centered"},tags:["autodocs"]},u={render:()=>{const[i,s]=n.useState("medium");return e.jsx(c,{currentPriority:i,onPriorityChange:async a=>{await new Promise(t=>setTimeout(t,500)),s(a)}})}},d={render:()=>{const[i,s]=n.useState("high");return e.jsx(c,{currentPriority:i,onPriorityChange:async a=>{await new Promise(t=>setTimeout(t,500)),s(a)}})}},y={render:()=>{const[i,s]=n.useState("critical");return e.jsx(c,{currentPriority:i,onPriorityChange:async a=>{await new Promise(t=>setTimeout(t,500)),s(a)}})}},p={args:{currentPriority:"medium",onPriorityChange:async()=>{},disabled:!0}},g={render:()=>{const[i,s]=n.useState("medium");return e.jsx(c,{currentPriority:i,onPriorityChange:async()=>{throw await new Promise(a=>setTimeout(a,500)),new Error("Failed to update priority")}})}};var C,j,E;u.parameters={...u.parameters,docs:{...(C=u.parameters)==null?void 0:C.docs,source:{originalSource:`{
  render: () => {
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
    return <PriorityEditor currentPriority={priority} onPriorityChange={async newPriority => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setPriority(newPriority);
    }} />;
  }
}`,...(E=(j=u.parameters)==null?void 0:j.docs)==null?void 0:E.source}}};var N,T,I;d.parameters={...d.parameters,docs:{...(N=d.parameters)==null?void 0:N.docs,source:{originalSource:`{
  render: () => {
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
    return <PriorityEditor currentPriority={priority} onPriorityChange={async newPriority => {
      await new Promise(resolve => setTimeout(resolve, 500));
      setPriority(newPriority);
    }} />;
  }
}`,...(I=(T=d.parameters)==null?void 0:T.docs)==null?void 0:I.source}}};var k,q,A;y.parameters={...y.parameters,docs:{...(k=y.parameters)==null?void 0:k.docs,source:{originalSource:`{
  render: () => {
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('critical');
    return <PriorityEditor currentPriority={priority} onPriorityChange={async newPriority => {
      await new Promise(resolve => setTimeout(resolve, 500));
      setPriority(newPriority);
    }} />;
  }
}`,...(A=(q=y.parameters)==null?void 0:q.docs)==null?void 0:A.source}}};var R,D,M;p.parameters={...p.parameters,docs:{...(R=p.parameters)==null?void 0:R.docs,source:{originalSource:`{
  args: {
    currentPriority: 'medium',
    onPriorityChange: async () => {},
    disabled: true
  }
}`,...(M=(D=p.parameters)==null?void 0:D.docs)==null?void 0:M.source}}};var L,V,_;g.parameters={...g.parameters,docs:{...(L=g.parameters)==null?void 0:L.docs,source:{originalSource:`{
  render: () => {
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
    return <PriorityEditor currentPriority={priority} onPriorityChange={async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      throw new Error('Failed to update priority');
    }} />;
  }
}`,...(_=(V=g.parameters)==null?void 0:V.docs)==null?void 0:_.source}}};const we=["Default","High","Critical","Disabled","WithError"];export{y as Critical,u as Default,p as Disabled,d as High,g as WithError,we as __namedExportsOrder,he as default};
