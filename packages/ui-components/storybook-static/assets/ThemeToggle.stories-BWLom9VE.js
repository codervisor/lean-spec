import{j as n}from"./jsx-runtime-D_zvdyIk.js";import{r as m}from"./index-DhY--VwN.js";import{B as M}from"./button-CSBTRrdr.js";import{c as d}from"./utils-CDN07tui.js";import{c as S}from"./createLucideIcon-CmAQLPQa.js";import"./index-BnZ-dH4k.js";import"./index-C2vczdB5.js";/**
 * @license lucide-react v0.553.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]],C=S("moon",j);/**
 * @license lucide-react v0.553.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I=[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]],_=S("sun",I);function u({theme:a="light",onThemeChange:e,className:s,size:o="icon"}){const r=a==="dark",h=()=>{const t=r?"light":"dark";e==null||e(t)};return n.jsxs(M,{variant:"ghost",size:o,onClick:h,className:d("relative",s),"aria-label":`Switch to ${r?"light":"dark"} theme`,children:[n.jsx(_,{className:d("h-5 w-5 transition-all",r?"-rotate-90 scale-0":"rotate-0 scale-100")}),n.jsx(C,{className:d("absolute h-5 w-5 transition-all",r?"rotate-0 scale-100":"rotate-90 scale-0")})]})}function L(a="system"){const[e,s]=m.useState(a),[o,r]=m.useState(!1);m.useEffect(()=>{r(!0);const t=localStorage.getItem("theme");if(t)s(t);else try{typeof window<"u"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches&&s("dark")}catch{}},[]),m.useEffect(()=>{if(!o)return;const t=document.documentElement;if(t.classList.remove("light","dark"),e==="system")try{const N=typeof window<"u"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";t.classList.add(N)}catch{t.classList.add("light")}else t.classList.add(e);localStorage.setItem("theme",e)},[e,o]);const h=m.useCallback(t=>{s(t)},[]);return{theme:e,setTheme:h,mounted:o}}u.__docgenInfo={description:"",methods:[],displayName:"ThemeToggle",props:{theme:{required:!1,tsType:{name:"union",raw:"'light' | 'dark' | 'system'",elements:[{name:"literal",value:"'light'"},{name:"literal",value:"'dark'"},{name:"literal",value:"'system'"}]},description:"Current theme",defaultValue:{value:"'light'",computed:!1}},onThemeChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(theme: Theme) => void",signature:{arguments:[{type:{name:"union",raw:"'light' | 'dark' | 'system'",elements:[{name:"literal",value:"'light'"},{name:"literal",value:"'dark'"},{name:"literal",value:"'system'"}]},name:"theme"}],return:{name:"void"}}},description:"Callback when theme changes"},className:{required:!1,tsType:{name:"string"},description:"Additional CSS classes"},size:{required:!1,tsType:{name:"union",raw:"'default' | 'sm' | 'lg' | 'icon'",elements:[{name:"literal",value:"'default'"},{name:"literal",value:"'sm'"},{name:"literal",value:"'lg'"},{name:"literal",value:"'icon'"}]},description:"Size variant",defaultValue:{value:"'icon'",computed:!1}}}};const $={title:"Navigation/ThemeToggle",component:u,parameters:{layout:"centered"},tags:["autodocs"]},l={args:{theme:"light",onThemeChange:a=>console.log("Theme changed:",a)}},c={args:{theme:"dark",onThemeChange:a=>console.log("Theme changed:",a)}},i={render:function(){const{theme:e,setTheme:s}=L("light");return n.jsxs("div",{className:"flex items-center gap-4",children:[n.jsx(u,{theme:e,onThemeChange:s}),n.jsxs("span",{className:"text-sm",children:["Current theme: ",e]})]})}};var g,p,f;l.parameters={...l.parameters,docs:{...(g=l.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    theme: 'light',
    onThemeChange: theme => console.log('Theme changed:', theme)
  }
}`,...(f=(p=l.parameters)==null?void 0:p.docs)==null?void 0:f.source}}};var T,k,y;c.parameters={...c.parameters,docs:{...(T=c.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    theme: 'dark',
    onThemeChange: theme => console.log('Theme changed:', theme)
  }
}`,...(y=(k=c.parameters)==null?void 0:k.docs)==null?void 0:y.source}}};var v,w,x;i.parameters={...i.parameters,docs:{...(v=i.parameters)==null?void 0:v.docs,source:{originalSource:`{
  render: function InteractiveThemeToggle() {
    const {
      theme,
      setTheme
    } = useTheme('light');
    return <div className="flex items-center gap-4">
        <ThemeToggle theme={theme} onThemeChange={setTheme} />
        <span className="text-sm">Current theme: {theme}</span>
      </div>;
  }
}`,...(x=(w=i.parameters)==null?void 0:w.docs)==null?void 0:x.source}}};const A=["Light","Dark","Interactive"];export{c as Dark,i as Interactive,l as Light,A as __namedExportsOrder,$ as default};
