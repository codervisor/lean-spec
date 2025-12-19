import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as f}from"./index-DhY--VwN.js";import{I as G,X as H}from"./input-Dpr9yJAF.js";import{B as J}from"./button-CSBTRrdr.js";import{c as g}from"./utils-CDN07tui.js";import{S as M}from"./search-DgDFmbNv.js";import"./createLucideIcon-CmAQLPQa.js";import"./index-BnZ-dH4k.js";import"./index-C2vczdB5.js";function S({value:t="",onChange:r,onSearch:o,showShortcut:c=!0,shortcutKey:n="K",clearable:v=!0,className:B,containerClassName:O,placeholder:P="Search...",...z}){const l=f.useRef(null);f.useEffect(()=>{if(!c)return;const a=s=>{var y;s.key.toLowerCase()===n.toLowerCase()&&(s.metaKey||s.ctrlKey)&&(s.preventDefault(),(y=l.current)==null||y.focus())};return document.addEventListener("keydown",a),()=>document.removeEventListener("keydown",a)},[c,n]);const A=a=>{r==null||r(a.target.value)},X=a=>{var s;a.key==="Enter"&&(o==null||o(t)),a.key==="Escape"&&(r==null||r(""),(s=l.current)==null||s.blur())},F=()=>{var a;r==null||r(""),(a=l.current)==null||a.focus()};return e.jsxs("div",{className:g("relative",O),children:[e.jsx(M,{className:"absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"}),e.jsx(G,{ref:l,type:"search",value:t,onChange:A,onKeyDown:X,placeholder:P,className:g("pl-9",v&&t&&"pr-16",B),...z}),e.jsxs("div",{className:"absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1",children:[v&&t&&e.jsx(J,{type:"button",variant:"ghost",size:"icon",className:"h-6 w-6",onClick:F,"aria-label":"Clear search",children:e.jsx(H,{className:"h-3.5 w-3.5"})}),c&&!t&&e.jsxs("kbd",{className:"pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 hidden sm:inline-flex",children:[e.jsx("span",{className:"text-xs",children:"⌘"}),n]})]})]})}S.__docgenInfo={description:"",methods:[],displayName:"SearchInput",props:{value:{required:!1,tsType:{name:"string"},description:"Current search value",defaultValue:{value:"''",computed:!1}},onChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(value: string) => void",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:"Callback when value changes"},onSearch:{required:!1,tsType:{name:"signature",type:"function",raw:"(value: string) => void",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:"Callback when search is submitted (Enter key)"},showShortcut:{required:!1,tsType:{name:"boolean"},description:"Show keyboard shortcut hint",defaultValue:{value:"true",computed:!1}},shortcutKey:{required:!1,tsType:{name:"string"},description:"Keyboard shortcut key (displayed in hint)",defaultValue:{value:"'K'",computed:!1}},clearable:{required:!1,tsType:{name:"boolean"},description:"Show clear button when there's a value",defaultValue:{value:"true",computed:!1}},containerClassName:{required:!1,tsType:{name:"string"},description:"Additional CSS classes for the container"},placeholder:{defaultValue:{value:"'Search...'",computed:!1},required:!1}},composes:["Omit"]};const se={title:"Search/SearchInput",component:S,parameters:{layout:"centered"},tags:["autodocs"],decorators:[t=>e.jsx("div",{className:"w-[300px]",children:e.jsx(t,{})})]},u={args:{placeholder:"Search specs..."}},i={args:{value:"ui components",placeholder:"Search specs..."}},p={args:{showShortcut:!1,placeholder:"Type to search..."}},d={args:{showShortcut:!0,shortcutKey:"P",placeholder:"Search projects..."}},m={args:{value:"some search",clearable:!1,placeholder:"Search..."}},h={render:function(){const[r,o]=f.useState(""),[c,n]=f.useState("");return e.jsxs("div",{className:"space-y-4",children:[e.jsx(S,{value:r,onChange:o,onSearch:n,placeholder:"Search and press Enter..."}),c&&e.jsxs("p",{className:"text-sm text-muted-foreground",children:["Last search: ",e.jsx("strong",{children:c})]})]})}};var x,w,b;u.parameters={...u.parameters,docs:{...(x=u.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    placeholder: 'Search specs...'
  }
}`,...(b=(w=u.parameters)==null?void 0:w.docs)==null?void 0:b.source}}};var j,N,I;i.parameters={...i.parameters,docs:{...(j=i.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    value: 'ui components',
    placeholder: 'Search specs...'
  }
}`,...(I=(N=i.parameters)==null?void 0:N.docs)==null?void 0:I.source}}};var k,E,V;p.parameters={...p.parameters,docs:{...(k=p.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    showShortcut: false,
    placeholder: 'Type to search...'
  }
}`,...(V=(E=p.parameters)==null?void 0:E.docs)==null?void 0:V.source}}};var L,T,q;d.parameters={...d.parameters,docs:{...(L=d.parameters)==null?void 0:L.docs,source:{originalSource:`{
  args: {
    showShortcut: true,
    shortcutKey: 'P',
    placeholder: 'Search projects...'
  }
}`,...(q=(T=d.parameters)==null?void 0:T.docs)==null?void 0:q.source}}};var K,C,D;m.parameters={...m.parameters,docs:{...(K=m.parameters)==null?void 0:K.docs,source:{originalSource:`{
  args: {
    value: 'some search',
    clearable: false,
    placeholder: 'Search...'
  }
}`,...(D=(C=m.parameters)==null?void 0:C.docs)==null?void 0:D.source}}};var W,_,R;h.parameters={...h.parameters,docs:{...(W=h.parameters)==null?void 0:W.docs,source:{originalSource:`{
  render: function InteractiveSearchInput() {
    const [value, setValue] = useState('');
    const [lastSearch, setLastSearch] = useState('');
    return <div className="space-y-4">
        <SearchInput value={value} onChange={setValue} onSearch={setLastSearch} placeholder="Search and press Enter..." />
        {lastSearch && <p className="text-sm text-muted-foreground">
            Last search: <strong>{lastSearch}</strong>
          </p>}
      </div>;
  }
}`,...(R=(_=h.parameters)==null?void 0:_.docs)==null?void 0:R.source}}};const ce=["Default","WithValue","WithoutShortcut","CustomShortcut","NotClearable","Interactive"];export{d as CustomShortcut,u as Default,h as Interactive,m as NotClearable,i as WithValue,p as WithoutShortcut,ce as __namedExportsOrder,se as default};
