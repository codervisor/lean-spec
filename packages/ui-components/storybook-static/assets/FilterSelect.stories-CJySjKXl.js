import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as f}from"./index-DhY--VwN.js";import{B as z}from"./button-CSBTRrdr.js";import{c}from"./utils-CDN07tui.js";import{C as H,a as g}from"./chevron-down-DnSTBhOw.js";import{b as M,a as G,C as J}from"./clock-psjzWXVS.js";import{A as K}from"./archive-ClFtL5lN.js";import"./index-BnZ-dH4k.js";import"./index-C2vczdB5.js";import"./createLucideIcon-CmAQLPQa.js";function h({value:s,options:l,onChange:a,placeholder:E="Select...",className:P,clearable:W=!0,clearLabel:_="All"}){const[o,n]=f.useState(!1),v=f.useRef(null);f.useEffect(()=>{const t=B=>{v.current&&!v.current.contains(B.target)&&n(!1)};return document.addEventListener("mousedown",t),()=>document.removeEventListener("mousedown",t)},[]);const r=l.find(t=>t.value===s),D=t=>{a==null||a(t),n(!1)},R=()=>{a==null||a(""),n(!1)};return e.jsxs("div",{ref:v,className:c("relative",P),children:[e.jsxs(z,{type:"button",variant:"outline",role:"combobox","aria-expanded":o,className:"w-full justify-between",onClick:()=>n(!o),children:[e.jsxs("span",{className:"flex items-center gap-2 truncate",children:[r==null?void 0:r.icon,(r==null?void 0:r.label)||E]}),e.jsx(H,{className:c("ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform",o&&"rotate-180")})]}),o&&e.jsxs("div",{className:"absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md",children:[W&&e.jsxs("button",{type:"button",className:c("relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",!s&&"bg-accent"),onClick:R,children:[e.jsx("span",{className:"flex-1 text-left",children:_}),!s&&e.jsx(g,{className:"h-4 w-4"})]}),l.map(t=>e.jsxs("button",{type:"button",className:c("relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",s===t.value&&"bg-accent"),onClick:()=>D(t.value),children:[t.icon,e.jsx("span",{className:"flex-1 text-left",children:t.label}),s===t.value&&e.jsx(g,{className:"h-4 w-4"})]},t.value))]})]})}h.__docgenInfo={description:"",methods:[],displayName:"FilterSelect",props:{value:{required:!1,tsType:{name:"string"},description:"Current selected value"},options:{required:!0,tsType:{name:"Array",elements:[{name:"FilterOption"}],raw:"FilterOption[]"},description:"Available options"},onChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(value: string) => void",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:"Callback when selection changes"},placeholder:{required:!1,tsType:{name:"string"},description:"Placeholder when no value selected",defaultValue:{value:"'Select...'",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"Additional CSS classes"},clearable:{required:!1,tsType:{name:"boolean"},description:"Allow clearing selection",defaultValue:{value:"true",computed:!1}},clearLabel:{required:!1,tsType:{name:"string"},description:"Label for clear option",defaultValue:{value:"'All'",computed:!1}}}};const re={title:"Search/FilterSelect",component:h,parameters:{layout:"centered"},tags:["autodocs"],decorators:[s=>e.jsx("div",{className:"w-[200px]",children:e.jsx(s,{})})]},x=[{value:"planned",label:"Planned",icon:e.jsx(M,{className:"h-4 w-4"})},{value:"in-progress",label:"In Progress",icon:e.jsx(G,{className:"h-4 w-4"})},{value:"complete",label:"Complete",icon:e.jsx(J,{className:"h-4 w-4"})},{value:"archived",label:"Archived",icon:e.jsx(K,{className:"h-4 w-4"})}],T=[{value:"low",label:"Low"},{value:"medium",label:"Medium"},{value:"high",label:"High"},{value:"critical",label:"Critical"}],i={args:{options:x,placeholder:"Select status..."}},u={args:{options:x,value:"in-progress",placeholder:"Select status..."}},p={args:{options:T,placeholder:"Select priority..."}},d={args:{options:T,clearable:!1,placeholder:"Select priority..."}},m={render:function(){const[l,a]=f.useState("");return e.jsxs("div",{className:"space-y-4",children:[e.jsx(h,{options:x,value:l,onChange:a,placeholder:"Filter by status...",clearLabel:"All statuses"}),e.jsxs("p",{className:"text-sm text-muted-foreground",children:["Selected: ",e.jsx("strong",{children:l||"none"})]})]})}};var b,y,S;i.parameters={...i.parameters,docs:{...(b=i.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    options: statusOptions,
    placeholder: 'Select status...'
  }
}`,...(S=(y=i.parameters)==null?void 0:y.docs)==null?void 0:S.source}}};var j,w,N;u.parameters={...u.parameters,docs:{...(j=u.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    options: statusOptions,
    value: 'in-progress',
    placeholder: 'Select status...'
  }
}`,...(N=(w=u.parameters)==null?void 0:w.docs)==null?void 0:N.source}}};var C,A,F;p.parameters={...p.parameters,docs:{...(C=p.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    options: priorityOptions,
    placeholder: 'Select priority...'
  }
}`,...(F=(A=p.parameters)==null?void 0:A.docs)==null?void 0:F.source}}};var k,O,I;d.parameters={...d.parameters,docs:{...(k=d.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    options: priorityOptions,
    clearable: false,
    placeholder: 'Select priority...'
  }
}`,...(I=(O=d.parameters)==null?void 0:O.docs)==null?void 0:I.source}}};var V,q,L;m.parameters={...m.parameters,docs:{...(V=m.parameters)==null?void 0:V.docs,source:{originalSource:`{
  render: function InteractiveFilterSelect() {
    const [value, setValue] = useState<string>('');
    return <div className="space-y-4">
        <FilterSelect options={statusOptions} value={value} onChange={setValue} placeholder="Filter by status..." clearLabel="All statuses" />
        <p className="text-sm text-muted-foreground">
          Selected: <strong>{value || 'none'}</strong>
        </p>
      </div>;
  }
}`,...(L=(q=m.parameters)==null?void 0:q.docs)==null?void 0:L.source}}};const le=["Default","WithValue","WithoutIcons","NotClearable","Interactive"];export{i as Default,m as Interactive,d as NotClearable,u as WithValue,p as WithoutIcons,le as __namedExportsOrder,re as default};
