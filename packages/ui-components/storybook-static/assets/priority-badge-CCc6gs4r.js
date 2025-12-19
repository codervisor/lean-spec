import{j as t}from"./jsx-runtime-D_zvdyIk.js";import{B as d}from"./badge-BcO251Zn.js";import{c}from"./utils-CDN07tui.js";import{A as g,C as m}from"./circle-alert-C6t9kq2b.js";import{M as b}from"./minus-B91E08-W.js";import{A as u}from"./arrow-up-CxjmGgh_.js";const p={critical:{icon:m,label:"Critical",className:"bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"},high:{icon:u,label:"High",className:"bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"},medium:{icon:b,label:"Medium",className:"bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"},low:{icon:g,label:"Low",className:"bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"}};function f({priority:i,className:n,iconOnly:r=!1,label:o,priorityConfig:a=p}){const e=a[i]||a.medium,l=e.icon,s=o??e.label;return t.jsxs(d,{className:c("flex items-center w-fit",!r&&"gap-1.5",e.className,n),children:[t.jsx(l,{className:"h-3.5 w-3.5"}),!r&&s]})}f.__docgenInfo={description:"",methods:[],displayName:"PriorityBadge",props:{priority:{required:!0,tsType:{name:"string"},description:"The priority to display"},className:{required:!1,tsType:{name:"string"},description:"Additional CSS classes"},iconOnly:{required:!1,tsType:{name:"boolean"},description:"Show only icon, no label",defaultValue:{value:"false",computed:!1}},label:{required:!1,tsType:{name:"string"},description:"Custom label override"},priorityConfig:{required:!1,tsType:{name:"Record",elements:[{name:"string"},{name:"PriorityConfig"}],raw:"Record<string, PriorityConfig>"},description:"Custom priority configuration",defaultValue:{value:`{
  critical: {
    icon: AlertCircle,
    label: 'Critical',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  high: {
    icon: ArrowUp,
    label: 'High',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  medium: {
    icon: Minus,
    label: 'Medium',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  low: {
    icon: ArrowDown,
    label: 'Low',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  },
}`,computed:!1}}}};export{f as P};
