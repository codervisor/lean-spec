import{j as s}from"./jsx-runtime-D_zvdyIk.js";import{S as a}from"./stats-card-DBFcdtGe.js";import{c as w}from"./utils-CDN07tui.js";import{F as T}from"./file-text-Di0opSds.js";import{C as N,a as F,b as L}from"./clock-psjzWXVS.js";import{A as O}from"./archive-ClFtL5lN.js";import"./card-D9kVXokR.js";import"./index-DhY--VwN.js";import"./createLucideIcon-CmAQLPQa.js";import"./minus-B91E08-W.js";const _={total:"Total Specs",totalSubtitle:"All specifications",completed:"Completed",completedSubtitle:"completion rate",inProgress:"In Progress",inProgressSubtitle:"Currently active",planned:"Planned",plannedSubtitle:"Not yet started",archived:"Archived",archivedSubtitle:"No longer active",completionRate:"completion rate"};function k({stats:t,showArchived:A=!1,className:R,labels:j={}}){const e={..._,...j};return s.jsxs("div",{className:w("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",R),children:[s.jsx(a,{title:e.total,value:t.totalSpecs,subtitle:e.totalSubtitle,icon:T,iconColorClass:"text-blue-600",gradientClass:"from-blue-500/10"}),s.jsx(a,{title:e.completed,value:t.completedSpecs,subtitle:`${t.completionRate}% ${e.completedSubtitle}`,icon:N,iconColorClass:"text-green-600",gradientClass:"from-green-500/10"}),s.jsx(a,{title:e.inProgress,value:t.inProgressSpecs,subtitle:e.inProgressSubtitle,icon:F,iconColorClass:"text-orange-600",gradientClass:"from-orange-500/10"}),s.jsx(a,{title:e.planned,value:t.plannedSpecs,subtitle:e.plannedSubtitle,icon:L,iconColorClass:"text-blue-600",gradientClass:"from-blue-500/10"}),A&&t.archivedSpecs!==void 0&&s.jsx(a,{title:e.archived,value:t.archivedSpecs,subtitle:e.archivedSubtitle,icon:O,iconColorClass:"text-gray-600",gradientClass:"from-gray-500/10"})]})}k.__docgenInfo={description:"",methods:[],displayName:"StatsOverview",props:{stats:{required:!0,tsType:{name:"StatsData"},description:"Stats data to display"},showArchived:{required:!1,tsType:{name:"boolean"},description:"Show archived specs card",defaultValue:{value:"false",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"Additional CSS classes"},labels:{required:!1,tsType:{name:"signature",type:"object",raw:`{
  total?: string;
  totalSubtitle?: string;
  completed?: string;
  completedSubtitle?: string;
  inProgress?: string;
  inProgressSubtitle?: string;
  planned?: string;
  plannedSubtitle?: string;
  archived?: string;
  archivedSubtitle?: string;
  completionRate?: string;
}`,signature:{properties:[{key:"total",value:{name:"string",required:!1}},{key:"totalSubtitle",value:{name:"string",required:!1}},{key:"completed",value:{name:"string",required:!1}},{key:"completedSubtitle",value:{name:"string",required:!1}},{key:"inProgress",value:{name:"string",required:!1}},{key:"inProgressSubtitle",value:{name:"string",required:!1}},{key:"planned",value:{name:"string",required:!1}},{key:"plannedSubtitle",value:{name:"string",required:!1}},{key:"archived",value:{name:"string",required:!1}},{key:"archivedSubtitle",value:{name:"string",required:!1}},{key:"completionRate",value:{name:"string",required:!1}}]}},description:"Labels for localization",defaultValue:{value:"{}",computed:!1}}}};const H={title:"Stats/StatsOverview",component:k,parameters:{layout:"padded"},tags:["autodocs"]},c={totalSpecs:42,completedSpecs:28,inProgressSpecs:8,plannedSpecs:6,archivedSpecs:0,completionRate:67},r={args:{stats:c}},n={args:{stats:{...c,archivedSpecs:5},showArchived:!0}},l={args:{stats:{totalSpecs:10,completedSpecs:0,inProgressSpecs:3,plannedSpecs:7,completionRate:0}}},o={args:{stats:{totalSpecs:15,completedSpecs:15,inProgressSpecs:0,plannedSpecs:0,completionRate:100}}},i={args:{stats:c,labels:{total:"总规格",totalSubtitle:"所有规格",completed:"已完成",completedSubtitle:"完成率",inProgress:"进行中",inProgressSubtitle:"当前活跃",planned:"计划中",plannedSubtitle:"尚未开始"}}};var p,d,u;r.parameters={...r.parameters,docs:{...(p=r.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    stats: sampleStats
  }
}`,...(u=(d=r.parameters)==null?void 0:d.docs)==null?void 0:u.source}}};var m,g,S;n.parameters={...n.parameters,docs:{...(m=n.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    stats: {
      ...sampleStats,
      archivedSpecs: 5
    },
    showArchived: true
  }
}`,...(S=(g=n.parameters)==null?void 0:g.docs)==null?void 0:S.source}}};var v,b,f;l.parameters={...l.parameters,docs:{...(v=l.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    stats: {
      totalSpecs: 10,
      completedSpecs: 0,
      inProgressSpecs: 3,
      plannedSpecs: 7,
      completionRate: 0
    }
  }
}`,...(f=(b=l.parameters)==null?void 0:b.docs)==null?void 0:f.source}}};var h,C,y;o.parameters={...o.parameters,docs:{...(h=o.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    stats: {
      totalSpecs: 15,
      completedSpecs: 15,
      inProgressSpecs: 0,
      plannedSpecs: 0,
      completionRate: 100
    }
  }
}`,...(y=(C=o.parameters)==null?void 0:C.docs)==null?void 0:y.source}}};var P,x,q;i.parameters={...i.parameters,docs:{...(P=i.parameters)==null?void 0:P.docs,source:{originalSource:`{
  args: {
    stats: sampleStats,
    labels: {
      total: '总规格',
      totalSubtitle: '所有规格',
      completed: '已完成',
      completedSubtitle: '完成率',
      inProgress: '进行中',
      inProgressSubtitle: '当前活跃',
      planned: '计划中',
      plannedSubtitle: '尚未开始'
    }
  }
}`,...(q=(x=i.parameters)==null?void 0:x.docs)==null?void 0:q.source}}};const J=["Default","WithArchived","ZeroCompletion","FullCompletion","CustomLabels"];export{i as CustomLabels,r as Default,o as FullCompletion,n as WithArchived,l as ZeroCompletion,J as __namedExportsOrder,H as default};
