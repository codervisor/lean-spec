import{j as s}from"./jsx-runtime-D_zvdyIk.js";import{C as w}from"./card-D9kVXokR.js";import{S as T}from"./spec-card--i0yRlvn.js";import{E}from"./empty-state-tDlJOqV2.js";import{S as v}from"./search-DgDFmbNv.js";import"./index-DhY--VwN.js";import"./utils-CDN07tui.js";import"./status-badge-COinvKLP.js";import"./badge-BcO251Zn.js";import"./index-C2vczdB5.js";import"./archive-ClFtL5lN.js";import"./createLucideIcon-CmAQLPQa.js";import"./clock-psjzWXVS.js";import"./priority-badge-CCc6gs4r.js";import"./circle-alert-C6t9kq2b.js";import"./minus-B91E08-W.js";import"./arrow-up-CxjmGgh_.js";import"./date-utils-BGj35H3S.js";import"./file-text-Di0opSds.js";import"./button-CSBTRrdr.js";import"./index-BnZ-dH4k.js";function R({results:r,query:e,isSearching:_=!1,onSpecClick:p}){return _?s.jsx(w,{className:"p-8",children:s.jsx("div",{className:"text-center text-muted-foreground",children:"Searching..."})}):r.length===0?s.jsx(E,{icon:v,title:"No results found",description:e?`No specs match "${e}"`:"Try a different search query"}):s.jsx("div",{className:"grid gap-4 sm:grid-cols-2 lg:grid-cols-3",children:r.map(c=>s.jsx(T,{spec:c,onClick:p?()=>p(c.id):void 0},c.id))})}R.__docgenInfo={description:"",methods:[],displayName:"SearchResults",props:{results:{required:!0,tsType:{name:"Array",elements:[{name:"LightweightSpec"}],raw:"LightweightSpec[]"},description:""},query:{required:!0,tsType:{name:"string"},description:""},isSearching:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},onSpecClick:{required:!1,tsType:{name:"signature",type:"function",raw:"(specId: string) => void",signature:{arguments:[{type:{name:"string"},name:"specId"}],return:{name:"void"}}},description:""}}};const Y={title:"Search/SearchResults",component:R,parameters:{layout:"padded"},tags:["autodocs"]},b=[{id:"185",specNumber:185,specName:"185-ui-components-extraction",title:"UI Components Extraction",status:"in-progress",priority:"high",tags:["ui","components","architecture"],updated_at:"2025-12-18T15:18:04.045Z"},{id:"184",specNumber:184,specName:"184-ui-packages-consolidation",title:"UI Packages Consolidation",status:"complete",priority:"high",tags:["ui","architecture"],updated_at:"2025-12-17T10:00:00.000Z"},{id:"186",specNumber:186,specName:"186-rust-http-server",title:"Rust HTTP Server",status:"planned",priority:"high",tags:["rust","backend"],updated_at:"2025-12-18T12:00:00.000Z"}],t={args:{results:b,query:"ui",onSpecClick:r=>console.log("Clicked spec:",r)}},a={args:{results:[],query:"nonexistent"}},o={args:{results:[],query:""}},n={args:{results:[],query:"searching...",isSearching:!0}},i={args:{results:Array.from({length:12},(r,e)=>({id:String(e+1),specNumber:e+1,specName:`${e+1}-example-spec`,title:`Example Spec ${e+1}`,status:["planned","in-progress","complete"][e%3],priority:["low","medium","high"][e%3],tags:["example","test"],updated_at:new Date(Date.now()-e*864e5).toISOString()})),query:"example",onSpecClick:r=>console.log("Clicked spec:",r)}};var m,u,l;t.parameters={...t.parameters,docs:{...(m=t.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    results: mockSpecs,
    query: 'ui',
    onSpecClick: specId => console.log('Clicked spec:', specId)
  }
}`,...(l=(u=t.parameters)==null?void 0:u.docs)==null?void 0:l.source}}};var d,g,h;a.parameters={...a.parameters,docs:{...(d=a.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    results: [],
    query: 'nonexistent'
  }
}`,...(h=(g=a.parameters)==null?void 0:g.docs)==null?void 0:h.source}}};var y,S,f;o.parameters={...o.parameters,docs:{...(y=o.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    results: [],
    query: ''
  }
}`,...(f=(S=o.parameters)==null?void 0:S.docs)==null?void 0:f.source}}};var x,N,q;n.parameters={...n.parameters,docs:{...(x=n.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    results: [],
    query: 'searching...',
    isSearching: true
  }
}`,...(q=(N=n.parameters)==null?void 0:N.docs)==null?void 0:q.source}}};var k,C,I;i.parameters={...i.parameters,docs:{...(k=i.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    results: Array.from({
      length: 12
    }, (_, i) => ({
      id: String(i + 1),
      specNumber: i + 1,
      specName: \`\${i + 1}-example-spec\`,
      title: \`Example Spec \${i + 1}\`,
      status: ['planned', 'in-progress', 'complete'][i % 3] as any,
      priority: ['low', 'medium', 'high'][i % 3] as any,
      tags: ['example', 'test'],
      updated_at: new Date(Date.now() - i * 86400000).toISOString()
    })),
    query: 'example',
    onSpecClick: specId => console.log('Clicked spec:', specId)
  }
}`,...(I=(C=i.parameters)==null?void 0:C.docs)==null?void 0:I.source}}};const ee=["WithResults","NoResults","EmptyQuery","Searching","ManyResults"];export{o as EmptyQuery,i as ManyResults,a as NoResults,n as Searching,t as WithResults,ee as __namedExportsOrder,Y as default};
