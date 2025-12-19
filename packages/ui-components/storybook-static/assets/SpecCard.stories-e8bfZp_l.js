import{j as s}from"./jsx-runtime-D_zvdyIk.js";import{S as i}from"./spec-card--i0yRlvn.js";import"./card-D9kVXokR.js";import"./index-DhY--VwN.js";import"./utils-CDN07tui.js";import"./status-badge-COinvKLP.js";import"./badge-BcO251Zn.js";import"./index-C2vczdB5.js";import"./archive-ClFtL5lN.js";import"./createLucideIcon-CmAQLPQa.js";import"./clock-psjzWXVS.js";import"./priority-badge-CCc6gs4r.js";import"./circle-alert-C6t9kq2b.js";import"./minus-B91E08-W.js";import"./arrow-up-CxjmGgh_.js";import"./date-utils-BGj35H3S.js";import"./file-text-Di0opSds.js";const Q={title:"Spec/SpecCard",component:i,parameters:{layout:"centered"},tags:["autodocs"],decorators:[E=>s.jsx("div",{className:"w-[350px]",children:s.jsx(E,{})})]},e={specNumber:185,specName:"ui-components-extraction",title:"UI Components Extraction",status:"in-progress",priority:"high",tags:["ui","components","architecture"],updatedAt:new Date().toISOString()},r={args:{spec:e}},t={args:{spec:{...e,status:"planned",priority:"medium"}}},a={args:{spec:{...e,status:"complete",priority:"high"}}},p={args:{spec:e,selected:!0}},o={args:{spec:{...e,tags:["ui","components","react","typescript","vite","storybook","testing"]},maxTags:4}},c={args:{spec:{specNumber:42,specName:"feature-implementation",title:null,status:"planned",priority:"low",tags:["feature"],updatedAt:null}}},n={decorators:[()=>s.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-[900px]",children:[s.jsx(i,{spec:e}),s.jsx(i,{spec:{...e,specNumber:186,title:"Rust HTTP Server",status:"planned"}}),s.jsx(i,{spec:{...e,specNumber:187,title:"Vite SPA Migration",status:"complete"}})]})]};var m,l,d;r.parameters={...r.parameters,docs:{...(m=r.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    spec: sampleSpec
  }
}`,...(d=(l=r.parameters)==null?void 0:l.docs)==null?void 0:d.source}}};var u,g,S;t.parameters={...t.parameters,docs:{...(u=t.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    spec: {
      ...sampleSpec,
      status: 'planned',
      priority: 'medium'
    }
  }
}`,...(S=(g=t.parameters)==null?void 0:g.docs)==null?void 0:S.source}}};var x,y,N;a.parameters={...a.parameters,docs:{...(x=a.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    spec: {
      ...sampleSpec,
      status: 'complete',
      priority: 'high'
    }
  }
}`,...(N=(y=a.parameters)==null?void 0:y.docs)==null?void 0:N.source}}};var h,T,b;p.parameters={...p.parameters,docs:{...(h=p.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    spec: sampleSpec,
    selected: true
  }
}`,...(b=(T=p.parameters)==null?void 0:T.docs)==null?void 0:b.source}}};var f,j,v;o.parameters={...o.parameters,docs:{...(f=o.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    spec: {
      ...sampleSpec,
      tags: ['ui', 'components', 'react', 'typescript', 'vite', 'storybook', 'testing']
    },
    maxTags: 4
  }
}`,...(v=(j=o.parameters)==null?void 0:j.docs)==null?void 0:v.source}}};var C,w,P;c.parameters={...c.parameters,docs:{...(C=c.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    spec: {
      specNumber: 42,
      specName: 'feature-implementation',
      title: null,
      status: 'planned',
      priority: 'low',
      tags: ['feature'],
      updatedAt: null
    }
  }
}`,...(P=(w=c.parameters)==null?void 0:w.docs)==null?void 0:P.source}}};var A,M,D;n.parameters={...n.parameters,docs:{...(A=n.parameters)==null?void 0:A.docs,source:{originalSource:`{
  decorators: [() => <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-[900px]">
        <SpecCard spec={sampleSpec} />
        <SpecCard spec={{
      ...sampleSpec,
      specNumber: 186,
      title: 'Rust HTTP Server',
      status: 'planned'
    }} />
        <SpecCard spec={{
      ...sampleSpec,
      specNumber: 187,
      title: 'Vite SPA Migration',
      status: 'complete'
    }} />
      </div>]
}`,...(D=(M=n.parameters)==null?void 0:M.docs)==null?void 0:D.source}}};const X=["Default","Planned","Complete","Selected","ManyTags","WithoutTitle","Grid"];export{a as Complete,r as Default,n as Grid,o as ManyTags,t as Planned,p as Selected,c as WithoutTitle,X as __namedExportsOrder,Q as default};
