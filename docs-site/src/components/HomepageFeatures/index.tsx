import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  icon: string;
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    icon: '🎯',
    title: 'Context Economy',
    description: (
      <>
        Specs under 300 lines. Read in 5-10 minutes. Fits in both human working memory 
        and AI context windows. No more cognitive overload.
      </>
    ),
  },
  {
    icon: '📈',
    title: 'Progressive Growth',
    description: (
      <>
        Start minimal. Add fields only when you feel pain. From solo dev to enterprise—one 
        system that adapts to your needs, not the other way around.
      </>
    ),
  },
  {
    icon: '🤖',
    title: 'AI-Native',
    description: (
      <>
        Works seamlessly with Cursor, Copilot, Aider, Claude Desktop (via MCP). 
        Clear specs mean AI agents can actually implement your vision.
      </>
    ),
  },
];

function Feature({icon, title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <div className={styles.featureIcon}>{icon}</div>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
