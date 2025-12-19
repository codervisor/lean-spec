import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{C as re,a as se,b as oe,c as ae}from"./card-D9kVXokR.js";import{B as x}from"./button-CSBTRrdr.js";import{B as h}from"./badge-BcO251Zn.js";import{P as te}from"./project-avatar-DrLaUvcG.js";import{c as y}from"./utils-CDN07tui.js";import{f as ne}from"./date-utils-BGj35H3S.js";import{S as C}from"./star-CZ-Ja2Kk.js";import{c as ie}from"./createLucideIcon-CmAQLPQa.js";import{F as ce}from"./file-text-Di0opSds.js";import"./index-DhY--VwN.js";import"./index-BnZ-dH4k.js";import"./index-C2vczdB5.js";import"./color-utils-Cz1Ld1cb.js";/**
 * @license lucide-react v0.553.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const le=[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["circle",{cx:"19",cy:"12",r:"1",key:"1wjl8i"}],["circle",{cx:"5",cy:"12",r:"1",key:"1pcz8c"}]],de=ie("ellipsis",le),pe={specs:"specs",spec:"spec",updated:"Updated",noDescription:"No description",toggleFavorite:"Toggle favorite",moreOptions:"More options"};function t({project:r,onClick:n,onFavoriteToggle:v,onMoreOptions:j,selected:J=!1,className:Q,locale:X,labels:Y={}}){const a={...pe,...Y},Z=r.specsCount===1?a.spec:a.specs;return e.jsxs(re,{className:y("cursor-pointer transition-all hover:shadow-md hover:border-primary/50",J&&"border-primary ring-2 ring-primary/20",Q),onClick:n,role:"button",tabIndex:0,onKeyDown:s=>{(s.key==="Enter"||s.key===" ")&&(s.preventDefault(),n==null||n())},children:[e.jsx(se,{className:"pb-3",children:e.jsxs("div",{className:"flex items-start justify-between gap-2",children:[e.jsxs("div",{className:"flex items-center gap-3 min-w-0",children:[e.jsx(te,{name:r.name,color:r.color||void 0,icon:r.icon||void 0,size:"lg"}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("h3",{className:"font-semibold text-base leading-tight truncate",children:r.name}),r.favorite&&e.jsx(C,{className:"h-4 w-4 shrink-0 fill-yellow-500 text-yellow-500"})]}),e.jsx("p",{className:"text-sm text-muted-foreground truncate mt-0.5",children:r.description||a.noDescription})]})]}),e.jsxs("div",{className:"flex items-center gap-1 shrink-0",children:[v&&e.jsx(x,{variant:"ghost",size:"icon",className:"h-8 w-8",onClick:s=>{s.stopPropagation(),v(!r.favorite)},"aria-label":a.toggleFavorite,children:e.jsx(C,{className:y("h-4 w-4",r.favorite?"fill-yellow-500 text-yellow-500":"text-muted-foreground")})}),j&&e.jsx(x,{variant:"ghost",size:"icon",className:"h-8 w-8",onClick:s=>{s.stopPropagation(),j()},"aria-label":a.moreOptions,children:e.jsx(de,{className:"h-4 w-4"})})]})]})}),e.jsx(oe,{className:"pt-0 pb-3",children:r.tags&&r.tags.length>0&&e.jsxs("div",{className:"flex flex-wrap gap-1 mb-3",children:[r.tags.slice(0,3).map((s,ee)=>e.jsx(h,{variant:"secondary",className:"text-xs px-1.5 py-0 h-5",children:s},`${s}-${ee}`)),r.tags.length>3&&e.jsxs(h,{variant:"outline",className:"text-xs px-1.5 py-0 h-5",children:["+",r.tags.length-3]})]})}),e.jsx(ae,{className:"pt-0",children:e.jsxs("div",{className:"flex items-center justify-between w-full text-xs text-muted-foreground",children:[e.jsxs("div",{className:"flex items-center gap-1",children:[e.jsx(ce,{className:"h-3.5 w-3.5"}),e.jsxs("span",{children:[r.specsCount??0," ",Z]})]}),r.updatedAt&&e.jsxs("span",{children:[a.updated," ",ne(r.updatedAt,X)]})]})})]})}t.__docgenInfo={description:"",methods:[],displayName:"ProjectCard",props:{project:{required:!0,tsType:{name:"ProjectCardData"},description:"Project data to display"},onClick:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:"Click handler for the card"},onFavoriteToggle:{required:!1,tsType:{name:"signature",type:"function",raw:"(favorite: boolean) => void",signature:{arguments:[{type:{name:"boolean"},name:"favorite"}],return:{name:"void"}}},description:"Handler for favorite toggle"},onMoreOptions:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:"Handler for more options"},selected:{required:!1,tsType:{name:"boolean"},description:"Whether the card is currently selected",defaultValue:{value:"false",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"Additional CSS classes"},locale:{required:!1,tsType:{name:"string"},description:"Locale for date formatting"},labels:{required:!1,tsType:{name:"signature",type:"object",raw:`{
  specs?: string;
  spec?: string;
  updated?: string;
  noDescription?: string;
  toggleFavorite?: string;
  moreOptions?: string;
}`,signature:{properties:[{key:"specs",value:{name:"string",required:!1}},{key:"spec",value:{name:"string",required:!1}},{key:"updated",value:{name:"string",required:!1}},{key:"noDescription",value:{name:"string",required:!1}},{key:"toggleFavorite",value:{name:"string",required:!1}},{key:"moreOptions",value:{name:"string",required:!1}}]}},description:"Labels for localization",defaultValue:{value:"{}",computed:!1}}}};const Pe={title:"Project/ProjectCard",component:t,parameters:{layout:"centered"},tags:["autodocs"],decorators:[r=>e.jsx("div",{className:"w-[350px]",children:e.jsx(r,{})})]},o={id:"1",name:"LeanSpec",description:"Lightweight spec methodology for AI-powered development",color:"#3b82f6",favorite:!0,specsCount:42,updatedAt:new Date().toISOString(),tags:["ui","components","typescript"]},i={args:{project:o,onClick:()=>console.log("Card clicked")}},c={args:{project:o,onClick:()=>console.log("Card clicked"),onFavoriteToggle:r=>console.log("Favorite toggled:",r),onMoreOptions:()=>console.log("More options clicked")}},l={args:{project:{...o,favorite:!1},onFavoriteToggle:r=>console.log("Favorite toggled:",r)}},d={args:{project:{...o,description:null}}},p={args:{project:{...o,tags:[]}}},m={args:{project:{...o,tags:["ui","components","typescript","react","storybook","tailwind"]}}},g={args:{project:o,selected:!0}},u={args:{project:{...o,specsCount:1}}},f={decorators:[()=>e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-[900px]",children:[e.jsx(t,{project:o,onClick:()=>{}}),e.jsx(t,{project:{id:"2",name:"Project Alpha",description:"An alpha project for testing",color:"#22c55e",specsCount:15,tags:["alpha","testing"]},onClick:()=>{}}),e.jsx(t,{project:{id:"3",name:"Documentation",description:"Documentation and guides",color:"#f97316",favorite:!0,specsCount:8},onClick:()=>{}})]})]};var N,w,k;i.parameters={...i.parameters,docs:{...(N=i.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    project: sampleProject,
    onClick: () => console.log('Card clicked')
  }
}`,...(k=(w=i.parameters)==null?void 0:w.docs)==null?void 0:k.source}}};var b,P,S;c.parameters={...c.parameters,docs:{...(b=c.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    project: sampleProject,
    onClick: () => console.log('Card clicked'),
    onFavoriteToggle: favorite => console.log('Favorite toggled:', favorite),
    onMoreOptions: () => console.log('More options clicked')
  }
}`,...(S=(P=c.parameters)==null?void 0:P.docs)==null?void 0:S.source}}};var T,F,D;l.parameters={...l.parameters,docs:{...(T=l.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    project: {
      ...sampleProject,
      favorite: false
    },
    onFavoriteToggle: favorite => console.log('Favorite toggled:', favorite)
  }
}`,...(D=(F=l.parameters)==null?void 0:F.docs)==null?void 0:D.source}}};var q,A,O;d.parameters={...d.parameters,docs:{...(q=d.parameters)==null?void 0:q.docs,source:{originalSource:`{
  args: {
    project: {
      ...sampleProject,
      description: null
    }
  }
}`,...(O=(A=d.parameters)==null?void 0:A.docs)==null?void 0:O.source}}};var L,M,_;p.parameters={...p.parameters,docs:{...(L=p.parameters)==null?void 0:L.docs,source:{originalSource:`{
  args: {
    project: {
      ...sampleProject,
      tags: []
    }
  }
}`,...(_=(M=p.parameters)==null?void 0:M.docs)==null?void 0:_.source}}};var z,I,B;m.parameters={...m.parameters,docs:{...(z=m.parameters)==null?void 0:z.docs,source:{originalSource:`{
  args: {
    project: {
      ...sampleProject,
      tags: ['ui', 'components', 'typescript', 'react', 'storybook', 'tailwind']
    }
  }
}`,...(B=(I=m.parameters)==null?void 0:I.docs)==null?void 0:B.source}}};var E,H,W;g.parameters={...g.parameters,docs:{...(E=g.parameters)==null?void 0:E.docs,source:{originalSource:`{
  args: {
    project: sampleProject,
    selected: true
  }
}`,...(W=(H=g.parameters)==null?void 0:H.docs)==null?void 0:W.source}}};var G,R,V;u.parameters={...u.parameters,docs:{...(G=u.parameters)==null?void 0:G.docs,source:{originalSource:`{
  args: {
    project: {
      ...sampleProject,
      specsCount: 1
    }
  }
}`,...(V=(R=u.parameters)==null?void 0:R.docs)==null?void 0:V.source}}};var $,K,U;f.parameters={...f.parameters,docs:{...($=f.parameters)==null?void 0:$.docs,source:{originalSource:`{
  decorators: [() => <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-[900px]">
        <ProjectCard project={sampleProject} onClick={() => {}} />
        <ProjectCard project={{
      id: '2',
      name: 'Project Alpha',
      description: 'An alpha project for testing',
      color: '#22c55e',
      specsCount: 15,
      tags: ['alpha', 'testing']
    }} onClick={() => {}} />
        <ProjectCard project={{
      id: '3',
      name: 'Documentation',
      description: 'Documentation and guides',
      color: '#f97316',
      favorite: true,
      specsCount: 8
    }} onClick={() => {}} />
      </div>]
}`,...(U=(K=f.parameters)==null?void 0:K.docs)==null?void 0:U.source}}};const Se=["Default","WithFavoriteToggle","NotFavorite","NoDescription","NoTags","ManyTags","Selected","SingleSpec","Grid"];export{i as Default,f as Grid,m as ManyTags,d as NoDescription,p as NoTags,l as NotFavorite,g as Selected,u as SingleSpec,c as WithFavoriteToggle,Se as __namedExportsOrder,Pe as default};
