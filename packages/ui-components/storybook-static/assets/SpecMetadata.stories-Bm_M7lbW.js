import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{C as U,b as Z}from"./card-D9kVXokR.js";import{B}from"./badge-BcO251Zn.js";import{A as $,d as z,g as E}from"./color-utils-Cz1Ld1cb.js";import{S as F}from"./status-badge-COinvKLP.js";import{P}from"./priority-badge-CCc6gs4r.js";import{b as l,f as p}from"./date-utils-BGj35H3S.js";import{c as V}from"./utils-CDN07tui.js";import{c as m}from"./createLucideIcon-CmAQLPQa.js";import{T as R}from"./tag-BlgyBuDl.js";import"./index-DhY--VwN.js";import"./index-C2vczdB5.js";import"./archive-ClFtL5lN.js";import"./clock-psjzWXVS.js";import"./circle-alert-C6t9kq2b.js";import"./minus-B91E08-W.js";import"./arrow-up-CxjmGgh_.js";/**
 * @license lucide-react v0.553.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],u=m("calendar",W);/**
 * @license lucide-react v0.553.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J=[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]],K=m("external-link",J);/**
 * @license lucide-react v0.553.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q=[["line",{x1:"6",x2:"6",y1:"3",y2:"15",key:"17qcm7"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["path",{d:"M18 9a9 9 0 0 1-9 9",key:"n2h4wq"}]],X=m("git-branch",Q);/**
 * @license lucide-react v0.553.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y=[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]],ee=m("user",Y),te={status:"Status",priority:"Priority",created:"Created",updated:"Updated",completed:"Completed",assignee:"Assignee",tags:"Tags",source:"Source",viewOnGitHub:"View on GitHub"};function O({spec:t,className:D,locale:a,labels:I={}}){const s={...te,...I};return e.jsx(U,{className:V(D),children:e.jsx(Z,{className:"pt-6",children:e.jsxs("dl",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx("dt",{className:"text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1",children:s.status}),e.jsx("dd",{children:e.jsx(F,{status:t.status||"planned"})})]}),e.jsxs("div",{children:[e.jsx("dt",{className:"text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1",children:s.priority}),e.jsx("dd",{children:e.jsx(P,{priority:t.priority||"medium"})})]}),e.jsxs("div",{children:[e.jsxs("dt",{className:"text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1",children:[e.jsx(u,{className:"h-4 w-4"}),s.created]}),e.jsx("dd",{className:"text-sm",children:t.createdAt?e.jsxs(e.Fragment,{children:[l(t.createdAt,a),e.jsxs("span",{className:"text-muted-foreground ml-1",children:["(",p(t.createdAt,a),")"]})]}):e.jsx("span",{className:"text-muted-foreground",children:"—"})})]}),e.jsxs("div",{children:[e.jsxs("dt",{className:"text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1",children:[e.jsx(u,{className:"h-4 w-4"}),s.updated]}),e.jsx("dd",{className:"text-sm",children:t.updatedAt?e.jsxs(e.Fragment,{children:[l(t.updatedAt,a),e.jsxs("span",{className:"text-muted-foreground ml-1",children:["(",p(t.updatedAt,a),")"]})]}):e.jsx("span",{className:"text-muted-foreground",children:"—"})})]}),t.completedAt&&e.jsxs("div",{className:"col-span-2",children:[e.jsxs("dt",{className:"text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1",children:[e.jsx(u,{className:"h-4 w-4"}),s.completed]}),e.jsxs("dd",{className:"text-sm",children:[l(t.completedAt,a),e.jsxs("span",{className:"text-muted-foreground ml-1",children:["(",p(t.completedAt,a),")"]})]})]}),t.assignee&&e.jsxs("div",{children:[e.jsxs("dt",{className:"text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1",children:[e.jsx(ee,{className:"h-4 w-4"}),s.assignee]}),e.jsx("dd",{children:e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx($,{size:"sm",children:e.jsx(z,{className:"text-xs",children:E(t.assignee)})}),e.jsx("span",{className:"text-sm",children:t.assignee})]})})]}),t.tags&&t.tags.length>0&&e.jsxs("div",{className:t.assignee?"":"col-span-2",children:[e.jsxs("dt",{className:"text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1",children:[e.jsx(R,{className:"h-4 w-4"}),s.tags]}),e.jsx("dd",{className:"flex gap-1 flex-wrap",children:t.tags.map((x,L)=>e.jsx(B,{variant:"outline",className:"text-xs",children:x},`${x}-${L}`))})]}),t.githubUrl&&e.jsxs("div",{className:"col-span-2",children:[e.jsxs("dt",{className:"text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1",children:[e.jsx(X,{className:"h-4 w-4"}),s.source]}),e.jsx("dd",{children:e.jsxs("a",{href:t.githubUrl,target:"_blank",rel:"noopener noreferrer",className:"text-sm text-primary hover:underline flex items-center gap-1",children:[s.viewOnGitHub,e.jsx(K,{className:"h-3.5 w-3.5"})]})})]})]})})})}O.__docgenInfo={description:"",methods:[],displayName:"SpecMetadata",props:{spec:{required:!0,tsType:{name:"SpecMetadataData"},description:"Spec data to display"},className:{required:!1,tsType:{name:"string"},description:"Additional CSS classes"},locale:{required:!1,tsType:{name:"string"},description:"Locale for date formatting"},labels:{required:!1,tsType:{name:"signature",type:"object",raw:`{
  status?: string;
  priority?: string;
  created?: string;
  updated?: string;
  completed?: string;
  assignee?: string;
  tags?: string;
  source?: string;
  viewOnGitHub?: string;
}`,signature:{properties:[{key:"status",value:{name:"string",required:!1}},{key:"priority",value:{name:"string",required:!1}},{key:"created",value:{name:"string",required:!1}},{key:"updated",value:{name:"string",required:!1}},{key:"completed",value:{name:"string",required:!1}},{key:"assignee",value:{name:"string",required:!1}},{key:"tags",value:{name:"string",required:!1}},{key:"source",value:{name:"string",required:!1}},{key:"viewOnGitHub",value:{name:"string",required:!1}}]}},description:"Labels for the metadata fields",defaultValue:{value:"{}",computed:!1}}}};const je={title:"Spec/SpecMetadata",component:O,parameters:{layout:"centered"},tags:["autodocs"],decorators:[t=>e.jsx("div",{className:"w-[400px]",children:e.jsx(t,{})})]},g={status:"in-progress",priority:"high",createdAt:"2025-12-01T10:00:00Z",updatedAt:new Date().toISOString(),assignee:"John Doe",tags:["ui","components","architecture"],githubUrl:"https://github.com/example/repo"},r={args:{spec:g}},n={args:{spec:{status:"planned",priority:"medium"}}},i={args:{spec:{...g,status:"complete",completedAt:"2025-12-15T14:30:00Z"}}},d={args:{spec:{status:"in-progress",priority:"high",createdAt:"2025-12-01T10:00:00Z",updatedAt:new Date().toISOString(),tags:["feature","api"]}}},c={args:{spec:{status:"in-progress",priority:"critical",createdAt:"2025-12-10T08:00:00Z",updatedAt:new Date().toISOString(),githubUrl:"https://github.com/codervisor/lean-spec/tree/main/specs/185-ui-components"}}},o={args:{spec:g,labels:{status:"状态",priority:"优先级",created:"创建时间",updated:"更新时间",assignee:"负责人",tags:"标签",source:"来源",viewOnGitHub:"在 GitHub 查看"},locale:"zh-CN"}};var h,f,y;r.parameters={...r.parameters,docs:{...(h=r.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    spec: sampleSpec
  }
}`,...(y=(f=r.parameters)==null?void 0:f.docs)==null?void 0:y.source}}};var j,N,b;n.parameters={...n.parameters,docs:{...(j=n.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    spec: {
      status: 'planned',
      priority: 'medium'
    }
  }
}`,...(b=(N=n.parameters)==null?void 0:N.docs)==null?void 0:b.source}}};var v,S,k;i.parameters={...i.parameters,docs:{...(v=i.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    spec: {
      ...sampleSpec,
      status: 'complete',
      completedAt: '2025-12-15T14:30:00Z'
    }
  }
}`,...(k=(S=i.parameters)==null?void 0:S.docs)==null?void 0:k.source}}};var A,w,q;d.parameters={...d.parameters,docs:{...(A=d.parameters)==null?void 0:A.docs,source:{originalSource:`{
  args: {
    spec: {
      status: 'in-progress',
      priority: 'high',
      createdAt: '2025-12-01T10:00:00Z',
      updatedAt: new Date().toISOString(),
      tags: ['feature', 'api']
    }
  }
}`,...(q=(w=d.parameters)==null?void 0:w.docs)==null?void 0:q.source}}};var T,C,M;c.parameters={...c.parameters,docs:{...(T=c.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    spec: {
      status: 'in-progress',
      priority: 'critical',
      createdAt: '2025-12-10T08:00:00Z',
      updatedAt: new Date().toISOString(),
      githubUrl: 'https://github.com/codervisor/lean-spec/tree/main/specs/185-ui-components'
    }
  }
}`,...(M=(C=c.parameters)==null?void 0:C.docs)==null?void 0:M.source}}};var H,_,G;o.parameters={...o.parameters,docs:{...(H=o.parameters)==null?void 0:H.docs,source:{originalSource:`{
  args: {
    spec: sampleSpec,
    labels: {
      status: '状态',
      priority: '优先级',
      created: '创建时间',
      updated: '更新时间',
      assignee: '负责人',
      tags: '标签',
      source: '来源',
      viewOnGitHub: '在 GitHub 查看'
    },
    locale: 'zh-CN'
  }
}`,...(G=(_=o.parameters)==null?void 0:_.docs)==null?void 0:G.source}}};const Ne=["Default","Minimal","Complete","NoAssignee","WithGitHub","CustomLabels"];export{i as Complete,o as CustomLabels,r as Default,n as Minimal,d as NoAssignee,c as WithGitHub,Ne as __namedExportsOrder,je as default};
