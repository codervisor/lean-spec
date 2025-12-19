import{j as r}from"./jsx-runtime-D_zvdyIk.js";import{B as c}from"./badge-BcO251Zn.js";import{c as g}from"./utils-CDN07tui.js";import{A as d}from"./archive-ClFtL5lN.js";import{C as m,a as b,b as u}from"./clock-psjzWXVS.js";const p={planned:{icon:u,label:"Planned",className:"bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"},"in-progress":{icon:b,label:"In Progress",className:"bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"},complete:{icon:m,label:"Complete",className:"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"},archived:{icon:d,label:"Archived",className:"bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"}};function f({status:t,className:s,iconOnly:a=!1,label:l,statusConfig:n=p}){const e=n[t]||n.planned,o=e.icon,i=l??e.label;return r.jsxs(c,{className:g("flex items-center w-fit",!a&&"gap-1.5",e.className,s),children:[r.jsx(o,{className:"h-3.5 w-3.5"}),!a&&i]})}f.__docgenInfo={description:"",methods:[],displayName:"StatusBadge",props:{status:{required:!0,tsType:{name:"string"},description:"The status to display"},className:{required:!1,tsType:{name:"string"},description:"Additional CSS classes"},iconOnly:{required:!1,tsType:{name:"boolean"},description:"Show only icon, no label",defaultValue:{value:"false",computed:!1}},label:{required:!1,tsType:{name:"string"},description:"Custom label override"},statusConfig:{required:!1,tsType:{name:"Record",elements:[{name:"string"},{name:"StatusConfig"}],raw:"Record<string, StatusConfig>"},description:"Custom status configuration",defaultValue:{value:`{
  planned: {
    icon: Clock,
    label: 'Planned',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  'in-progress': {
    icon: PlayCircle,
    label: 'In Progress',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  complete: {
    icon: CheckCircle2,
    label: 'Complete',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  archived: {
    icon: Archive,
    label: 'Archived',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  },
}`,computed:!1}}}};export{f as S};
