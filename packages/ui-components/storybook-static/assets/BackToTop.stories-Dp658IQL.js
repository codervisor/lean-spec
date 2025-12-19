import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as l}from"./index-DhY--VwN.js";import{B as w}from"./button-CSBTRrdr.js";import{c as S}from"./utils-CDN07tui.js";import{A as j}from"./arrow-up-CxjmGgh_.js";import"./index-BnZ-dH4k.js";import"./index-C2vczdB5.js";import"./createLucideIcon-CmAQLPQa.js";function g({threshold:t=300,className:f,bottom:r=24,right:n=24}){const[x,i]=l.useState(!1);l.useEffect(()=>{const a=()=>{window.scrollY>t?i(!0):i(!1)};return window.addEventListener("scroll",a),()=>window.removeEventListener("scroll",a)},[t]);const v=()=>{window.scrollTo({top:0,behavior:"smooth"})};if(!x)return null;const b=typeof r=="number"?`${r}px`:r,y=typeof n=="number"?`${n}px`:n;return e.jsx(w,{onClick:v,size:"icon",className:S("fixed h-12 w-12 rounded-full shadow-lg z-40 hover:scale-110 transition-transform",f),style:{bottom:b,right:y},"aria-label":"Back to top",children:e.jsx(j,{className:"h-5 w-5"})})}g.__docgenInfo={description:"",methods:[],displayName:"BackToTop",props:{threshold:{required:!1,tsType:{name:"number"},description:"Scroll threshold before showing button (in pixels)",defaultValue:{value:"300",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"Additional CSS classes"},bottom:{required:!1,tsType:{name:"union",raw:"string | number",elements:[{name:"string"},{name:"number"}]},description:"Position from bottom (in pixels or CSS value)",defaultValue:{value:"24",computed:!1}},right:{required:!1,tsType:{name:"union",raw:"string | number",elements:[{name:"string"},{name:"number"}]},description:"Position from right (in pixels or CSS value)",defaultValue:{value:"24",computed:!1}}}};const q={title:"Navigation/BackToTop",component:g,parameters:{layout:"fullscreen"},tags:["autodocs"]},o={decorators:[t=>e.jsxs("div",{style:{height:"200vh",padding:"2rem"},children:[e.jsx("p",{children:"Scroll down to see the back to top button"}),e.jsx("div",{style:{height:"500px"}}),e.jsx("p",{children:"Keep scrolling..."}),e.jsx("div",{style:{height:"500px"}}),e.jsx("p",{children:"Almost there..."}),e.jsx(t,{})]})],args:{threshold:300}},s={decorators:[t=>e.jsxs("div",{style:{height:"200vh",padding:"2rem"},children:[e.jsx("p",{children:"Scroll down to see the back to top button at custom position"}),e.jsx("div",{style:{height:"1000px"}}),e.jsx(t,{})]})],args:{threshold:200,bottom:48,right:48}};var p,d,c;o.parameters={...o.parameters,docs:{...(p=o.parameters)==null?void 0:p.docs,source:{originalSource:`{
  decorators: [Story => <div style={{
    height: '200vh',
    padding: '2rem'
  }}>
        <p>Scroll down to see the back to top button</p>
        <div style={{
      height: '500px'
    }} />
        <p>Keep scrolling...</p>
        <div style={{
      height: '500px'
    }} />
        <p>Almost there...</p>
        <Story />
      </div>],
  args: {
    threshold: 300
  }
}`,...(c=(d=o.parameters)==null?void 0:d.docs)==null?void 0:c.source}}};var m,u,h;s.parameters={...s.parameters,docs:{...(m=s.parameters)==null?void 0:m.docs,source:{originalSource:`{
  decorators: [Story => <div style={{
    height: '200vh',
    padding: '2rem'
  }}>
        <p>Scroll down to see the back to top button at custom position</p>
        <div style={{
      height: '1000px'
    }} />
        <Story />
      </div>],
  args: {
    threshold: 200,
    bottom: 48,
    right: 48
  }
}`,...(h=(u=s.parameters)==null?void 0:u.docs)==null?void 0:h.source}}};const P=["Default","CustomPosition"];export{s as CustomPosition,o as Default,P as __namedExportsOrder,q as default};
