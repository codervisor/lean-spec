import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{c as f}from"./utils-CDN07tui.js";const ne={default:"bg-primary",success:"bg-green-500",warning:"bg-orange-500",danger:"bg-red-500",info:"bg-blue-500"},le={sm:"h-1.5",md:"h-2",lg:"h-3"};function a({value:p,label:v,showPercentage:h=!1,variant:ae="default",size:re="md",className:se}){const b=Math.min(100,Math.max(0,p));return e.jsxs("div",{className:f("w-full",se),children:[(v||h)&&e.jsxs("div",{className:"flex items-center justify-between mb-1",children:[v&&e.jsx("span",{className:"text-sm font-medium",children:v}),h&&e.jsxs("span",{className:"text-sm text-muted-foreground",children:[Math.round(b),"%"]})]}),e.jsx("div",{className:f("w-full bg-muted rounded-full overflow-hidden",le[re]),children:e.jsx("div",{className:f("h-full rounded-full transition-all duration-300",ne[ae]),style:{width:`${b}%`}})})]})}a.__docgenInfo={description:"",methods:[],displayName:"ProgressBar",props:{value:{required:!0,tsType:{name:"number"},description:"Progress value (0-100)"},label:{required:!1,tsType:{name:"string"},description:"Label to display"},showPercentage:{required:!1,tsType:{name:"boolean"},description:"Show percentage",defaultValue:{value:"false",computed:!1}},variant:{required:!1,tsType:{name:"union",raw:"'default' | 'success' | 'warning' | 'danger' | 'info'",elements:[{name:"literal",value:"'default'"},{name:"literal",value:"'success'"},{name:"literal",value:"'warning'"},{name:"literal",value:"'danger'"},{name:"literal",value:"'info'"}]},description:"Color variant",defaultValue:{value:"'default'",computed:!1}},size:{required:!1,tsType:{name:"union",raw:"'sm' | 'md' | 'lg'",elements:[{name:"literal",value:"'sm'"},{name:"literal",value:"'md'"},{name:"literal",value:"'lg'"}]},description:"Size variant",defaultValue:{value:"'md'",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"Additional CSS classes"}}};const ce={title:"Stats/ProgressBar",component:a,parameters:{layout:"centered"},tags:["autodocs"],decorators:[p=>e.jsx("div",{className:"w-[300px]",children:e.jsx(p,{})})]},r={args:{value:67}},s={args:{value:75,label:"Completion Progress"}},n={args:{value:42,showPercentage:!0}},l={args:{value:88,label:"Tasks Completed",showPercentage:!0}},t={args:{value:100,label:"All Done!",variant:"success",showPercentage:!0}},o={args:{value:45,label:"Needs Attention",variant:"warning",showPercentage:!0}},c={args:{value:15,label:"Critical",variant:"danger",showPercentage:!0}},i={args:{value:60,label:"Loading...",variant:"info"}},u={args:{value:50,size:"sm"}},d={args:{value:50,size:"lg"}},m={decorators:[()=>e.jsxs("div",{className:"space-y-4 w-[300px]",children:[e.jsx(a,{value:50,size:"sm",label:"Small"}),e.jsx(a,{value:50,size:"md",label:"Medium"}),e.jsx(a,{value:50,size:"lg",label:"Large"})]})]},g={decorators:[()=>e.jsxs("div",{className:"space-y-4 w-[300px]",children:[e.jsx(a,{value:50,variant:"default",label:"Default",showPercentage:!0}),e.jsx(a,{value:100,variant:"success",label:"Success",showPercentage:!0}),e.jsx(a,{value:45,variant:"warning",label:"Warning",showPercentage:!0}),e.jsx(a,{value:15,variant:"danger",label:"Danger",showPercentage:!0}),e.jsx(a,{value:60,variant:"info",label:"Info",showPercentage:!0})]})]};var w,P,x;r.parameters={...r.parameters,docs:{...(w=r.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    value: 67
  }
}`,...(x=(P=r.parameters)==null?void 0:P.docs)==null?void 0:x.source}}};var S,j,y;s.parameters={...s.parameters,docs:{...(S=s.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    value: 75,
    label: 'Completion Progress'
  }
}`,...(y=(j=s.parameters)==null?void 0:j.docs)==null?void 0:y.source}}};var z,N,A;n.parameters={...n.parameters,docs:{...(z=n.parameters)==null?void 0:z.docs,source:{originalSource:`{
  args: {
    value: 42,
    showPercentage: true
  }
}`,...(A=(N=n.parameters)==null?void 0:N.docs)==null?void 0:A.source}}};var B,L,C;l.parameters={...l.parameters,docs:{...(B=l.parameters)==null?void 0:B.docs,source:{originalSource:`{
  args: {
    value: 88,
    label: 'Tasks Completed',
    showPercentage: true
  }
}`,...(C=(L=l.parameters)==null?void 0:L.docs)==null?void 0:C.source}}};var D,W,T;t.parameters={...t.parameters,docs:{...(D=t.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    value: 100,
    label: 'All Done!',
    variant: 'success',
    showPercentage: true
  }
}`,...(T=(W=t.parameters)==null?void 0:W.docs)==null?void 0:T.source}}};var q,V,I;o.parameters={...o.parameters,docs:{...(q=o.parameters)==null?void 0:q.docs,source:{originalSource:`{
  args: {
    value: 45,
    label: 'Needs Attention',
    variant: 'warning',
    showPercentage: true
  }
}`,...(I=(V=o.parameters)==null?void 0:V.docs)==null?void 0:I.source}}};var M,_,k;c.parameters={...c.parameters,docs:{...(M=c.parameters)==null?void 0:M.docs,source:{originalSource:`{
  args: {
    value: 15,
    label: 'Critical',
    variant: 'danger',
    showPercentage: true
  }
}`,...(k=(_=c.parameters)==null?void 0:_.docs)==null?void 0:k.source}}};var E,O,R;i.parameters={...i.parameters,docs:{...(E=i.parameters)==null?void 0:E.docs,source:{originalSource:`{
  args: {
    value: 60,
    label: 'Loading...',
    variant: 'info'
  }
}`,...(R=(O=i.parameters)==null?void 0:O.docs)==null?void 0:R.source}}};var $,F,G;u.parameters={...u.parameters,docs:{...($=u.parameters)==null?void 0:$.docs,source:{originalSource:`{
  args: {
    value: 50,
    size: 'sm'
  }
}`,...(G=(F=u.parameters)==null?void 0:F.docs)==null?void 0:G.source}}};var H,J,K;d.parameters={...d.parameters,docs:{...(H=d.parameters)==null?void 0:H.docs,source:{originalSource:`{
  args: {
    value: 50,
    size: 'lg'
  }
}`,...(K=(J=d.parameters)==null?void 0:J.docs)==null?void 0:K.source}}};var Q,U,X;m.parameters={...m.parameters,docs:{...(Q=m.parameters)==null?void 0:Q.docs,source:{originalSource:`{
  decorators: [() => <div className="space-y-4 w-[300px]">
        <ProgressBar value={50} size="sm" label="Small" />
        <ProgressBar value={50} size="md" label="Medium" />
        <ProgressBar value={50} size="lg" label="Large" />
      </div>]
}`,...(X=(U=m.parameters)==null?void 0:U.docs)==null?void 0:X.source}}};var Y,Z,ee;g.parameters={...g.parameters,docs:{...(Y=g.parameters)==null?void 0:Y.docs,source:{originalSource:`{
  decorators: [() => <div className="space-y-4 w-[300px]">
        <ProgressBar value={50} variant="default" label="Default" showPercentage />
        <ProgressBar value={100} variant="success" label="Success" showPercentage />
        <ProgressBar value={45} variant="warning" label="Warning" showPercentage />
        <ProgressBar value={15} variant="danger" label="Danger" showPercentage />
        <ProgressBar value={60} variant="info" label="Info" showPercentage />
      </div>]
}`,...(ee=(Z=g.parameters)==null?void 0:Z.docs)==null?void 0:ee.source}}};const ie=["Default","WithLabel","WithPercentage","WithLabelAndPercentage","Success","Warning","Danger","Info","Small","Large","AllSizes","AllVariants"];export{m as AllSizes,g as AllVariants,c as Danger,r as Default,i as Info,d as Large,u as Small,t as Success,o as Warning,s as WithLabel,l as WithLabelAndPercentage,n as WithPercentage,ie as __namedExportsOrder,ce as default};
