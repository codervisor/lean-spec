import{j as t}from"./jsx-runtime-D_zvdyIk.js";import{r as o}from"./index-DhY--VwN.js";import{B as p}from"./button-CSBTRrdr.js";import{X as Z,I as $}from"./input-Dpr9yJAF.js";import{R as b,P as ee,C as X,a as te,T as G,D as J,O as K}from"./index-CO7ovZMe.js";import{c as m}from"./utils-CDN07tui.js";import{F as O}from"./folder-open-DFqx8qYq.js";import"./index-BnZ-dH4k.js";import"./index-C2vczdB5.js";import"./createLucideIcon-CmAQLPQa.js";import"./index-BG3m2RIl.js";import"./index-CE4oAmmT.js";import"./index-BoxsY6nR.js";const ae=b,ne=ee,j=o.forwardRef(({className:a,...n},r)=>t.jsx(K,{ref:r,className:m("fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",a),...n}));j.displayName=K.displayName;const w=o.forwardRef(({className:a,children:n,...r},s)=>t.jsxs(ne,{children:[t.jsx(j,{}),t.jsxs(X,{ref:s,className:m("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",a),...r,children:[n,t.jsxs(te,{className:"absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",children:[t.jsx(Z,{className:"h-4 w-4"}),t.jsx("span",{className:"sr-only",children:"Close"})]})]})]}));w.displayName=X.displayName;const v=({className:a,...n})=>t.jsx("div",{className:m("flex flex-col space-y-1.5 text-center sm:text-left",a),...n});v.displayName="DialogHeader";const P=({className:a,...n})=>t.jsx("div",{className:m("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",a),...n});P.displayName="DialogFooter";const N=o.forwardRef(({className:a,...n},r)=>t.jsx(G,{ref:r,className:m("text-lg font-semibold leading-none tracking-tight",a),...n}));N.displayName=G.displayName;const k=o.forwardRef(({className:a,...n},r)=>t.jsx(J,{ref:r,className:m("text-sm text-muted-foreground",a),...n}));k.displayName=J.displayName;j.__docgenInfo={description:"",methods:[]};w.__docgenInfo={description:"",methods:[]};v.__docgenInfo={description:"",methods:[],displayName:"DialogHeader"};P.__docgenInfo={description:"",methods:[],displayName:"DialogFooter"};N.__docgenInfo={description:"",methods:[]};k.__docgenInfo={description:"",methods:[]};function C({open:a,onOpenChange:n,onSubmit:r,onBrowseFolder:s,isLoading:c=!1,labels:e}){const[i,u]=o.useState(""),[D,g]=o.useState(s?"picker":"manual"),[S,T]=o.useState(!1);o.useEffect(()=>{a&&(g(s?"picker":"manual"),u(""))},[a,s]);const Q=async d=>{d==null||d.preventDefault(),i&&await r(i)},Y=async()=>{if(s){T(!0);try{const d=await s();d&&(u(d),g("manual"))}finally{T(!1)}}};return t.jsx(ae,{open:a,onOpenChange:n,children:t.jsxs(w,{className:"sm:max-w-[600px]",children:[t.jsxs(v,{children:[t.jsx(N,{children:(e==null?void 0:e.title)||"Create Project"}),t.jsx(k,{children:D==="picker"?(e==null?void 0:e.descriptionPicker)||"Browse and select a folder containing your specs":(e==null?void 0:e.descriptionManual)||"Enter the path to your specs folder"})]}),D==="picker"&&s?t.jsxs("div",{className:"space-y-4",children:[t.jsxs(p,{onClick:Y,disabled:S||c,className:"w-full",size:"lg",children:[t.jsx(O,{className:"mr-2 h-5 w-5"}),S?"Browsing...":(e==null?void 0:e.browseFolders)||"Browse Folders"]}),t.jsx("div",{className:"flex justify-center",children:t.jsx(p,{variant:"link",size:"sm",onClick:()=>g("manual"),className:"text-muted-foreground",children:(e==null?void 0:e.enterManually)||"Enter path manually"})})]}):t.jsxs("form",{onSubmit:Q,children:[t.jsx("div",{className:"grid gap-4 py-4",children:t.jsxs("div",{className:"grid gap-2",children:[t.jsx("label",{htmlFor:"path",className:"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",children:(e==null?void 0:e.pathLabel)||"Project Path"}),t.jsx("div",{className:"flex gap-2",children:t.jsx($,{id:"path",value:i,onChange:d=>u(d.target.value),placeholder:(e==null?void 0:e.pathPlaceholder)||"/path/to/your/project",className:"flex-1",disabled:c})}),t.jsx("p",{className:"text-xs text-muted-foreground",children:(e==null?void 0:e.pathHelp)||"The folder should contain a specs/ directory"})]})}),t.jsxs(P,{className:"flex-col sm:flex-row gap-2",children:[s&&t.jsx("div",{className:"flex-1 flex justify-start",children:t.jsxs(p,{type:"button",variant:"ghost",size:"sm",onClick:()=>g("picker"),children:[t.jsx(O,{className:"h-4 w-4 mr-2"}),(e==null?void 0:e.browseFolders)||"Browse Folders"]})}),t.jsx(p,{type:"button",variant:"outline",onClick:()=>n(!1),disabled:c,children:(e==null?void 0:e.cancel)||"Cancel"}),t.jsx(p,{type:"submit",disabled:c||!i,children:c?(e==null?void 0:e.adding)||"Adding...":(e==null?void 0:e.action)||"Add Project"})]})]})]})})}C.__docgenInfo={description:"",methods:[],displayName:"ProjectDialog",props:{open:{required:!0,tsType:{name:"boolean"},description:""},onOpenChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(open: boolean) => void",signature:{arguments:[{type:{name:"boolean"},name:"open"}],return:{name:"void"}}},description:""},onSubmit:{required:!0,tsType:{name:"signature",type:"function",raw:"(path: string) => Promise<void> | void",signature:{arguments:[{type:{name:"string"},name:"path"}],return:{name:"union",raw:"Promise<void> | void",elements:[{name:"Promise",elements:[{name:"void"}],raw:"Promise<void>"},{name:"void"}]}}},description:""},onBrowseFolder:{required:!1,tsType:{name:"signature",type:"function",raw:"() => Promise<string | null>",signature:{arguments:[],return:{name:"Promise",elements:[{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]}],raw:"Promise<string | null>"}}},description:""},isLoading:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},labels:{required:!1,tsType:{name:"signature",type:"object",raw:`{
  title?: string;
  descriptionPicker?: string;
  descriptionManual?: string;
  pathLabel?: string;
  pathPlaceholder?: string;
  pathHelp?: string;
  action?: string;
  adding?: string;
  cancel?: string;
  browseFolders?: string;
  enterManually?: string;
}`,signature:{properties:[{key:"title",value:{name:"string",required:!1}},{key:"descriptionPicker",value:{name:"string",required:!1}},{key:"descriptionManual",value:{name:"string",required:!1}},{key:"pathLabel",value:{name:"string",required:!1}},{key:"pathPlaceholder",value:{name:"string",required:!1}},{key:"pathHelp",value:{name:"string",required:!1}},{key:"action",value:{name:"string",required:!1}},{key:"adding",value:{name:"string",required:!1}},{key:"cancel",value:{name:"string",required:!1}},{key:"browseFolders",value:{name:"string",required:!1}},{key:"enterManually",value:{name:"string",required:!1}}]}},description:""}}};const ye={title:"Project/ProjectDialog",component:C,parameters:{layout:"centered"},tags:["autodocs"]},l={args:{open:!0,onOpenChange:a=>console.log("Open changed:",a),onSubmit:async a=>{console.log("Submitted path:",a),await new Promise(n=>setTimeout(n,1e3))}}},f={args:{...l.args,onBrowseFolder:async()=>(await new Promise(a=>setTimeout(a,500)),"/Users/username/projects/my-project")}},h={args:{...l.args,isLoading:!0}},y={render:()=>{const[a,n]=o.useState(!1),[r,s]=o.useState(!1),c=async i=>{s(!0),await new Promise(u=>setTimeout(u,1500)),console.log("Submitted:",i),s(!1),n(!1)},e=async()=>(await new Promise(i=>setTimeout(i,500)),"/Users/username/projects/selected-project");return t.jsxs("div",{children:[t.jsx(p,{onClick:()=>n(!0),children:"Open Dialog"}),t.jsx(C,{open:a,onOpenChange:n,onSubmit:c,onBrowseFolder:e,isLoading:r})]})}},x={args:{...l.args,labels:{title:"Add New Project",descriptionPicker:"Choose a folder from your file system",descriptionManual:"Type the path to your project folder",pathLabel:"Folder Path",pathPlaceholder:"e.g., /Users/me/my-project",pathHelp:"The folder should contain your project files",action:"Create",adding:"Creating...",cancel:"Abort",browseFolders:"Choose Folder",enterManually:"Type path instead"}}};var q,F,I;l.parameters={...l.parameters,docs:{...(q=l.parameters)==null?void 0:q.docs,source:{originalSource:`{
  args: {
    open: true,
    onOpenChange: open => console.log('Open changed:', open),
    onSubmit: async path => {
      console.log('Submitted path:', path);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}`,...(I=(F=l.parameters)==null?void 0:F.docs)==null?void 0:I.source}}};var L,_,B;f.parameters={...f.parameters,docs:{...(L=f.parameters)==null?void 0:L.docs,source:{originalSource:`{
  args: {
    ...Default.args,
    onBrowseFolder: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return '/Users/username/projects/my-project';
    }
  }
}`,...(B=(_=f.parameters)==null?void 0:_.docs)==null?void 0:B.source}}};var M,H,z;h.parameters={...h.parameters,docs:{...(M=h.parameters)==null?void 0:M.docs,source:{originalSource:`{
  args: {
    ...Default.args,
    isLoading: true
  }
}`,...(z=(H=h.parameters)==null?void 0:H.docs)==null?void 0:z.source}}};var R,A,E;y.parameters={...y.parameters,docs:{...(R=y.parameters)==null?void 0:R.docs,source:{originalSource:`{
  render: () => {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const handleSubmit = async (path: string) => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Submitted:', path);
      setIsLoading(false);
      setOpen(false);
    };
    const handleBrowse = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return '/Users/username/projects/selected-project';
    };
    return <div>
        <Button onClick={() => setOpen(true)}>Open Dialog</Button>
        <ProjectDialog open={open} onOpenChange={setOpen} onSubmit={handleSubmit} onBrowseFolder={handleBrowse} isLoading={isLoading} />
      </div>;
  }
}`,...(E=(A=y.parameters)==null?void 0:A.docs)==null?void 0:E.source}}};var U,W,V;x.parameters={...x.parameters,docs:{...(U=x.parameters)==null?void 0:U.docs,source:{originalSource:`{
  args: {
    ...Default.args,
    labels: {
      title: 'Add New Project',
      descriptionPicker: 'Choose a folder from your file system',
      descriptionManual: 'Type the path to your project folder',
      pathLabel: 'Folder Path',
      pathPlaceholder: 'e.g., /Users/me/my-project',
      pathHelp: 'The folder should contain your project files',
      action: 'Create',
      adding: 'Creating...',
      cancel: 'Abort',
      browseFolders: 'Choose Folder',
      enterManually: 'Type path instead'
    }
  }
}`,...(V=(W=x.parameters)==null?void 0:W.docs)==null?void 0:V.source}}};const xe=["Default","WithBrowse","Loading","Interactive","CustomLabels"];export{x as CustomLabels,l as Default,y as Interactive,h as Loading,f as WithBrowse,xe as __namedExportsOrder,ye as default};
