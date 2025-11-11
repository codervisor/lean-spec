import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import Translate from '@docusaurus/Translate';
import styles from './styles.module.css';

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <div className={clsx('col col--4')}>
            <div className="text--center padding-horiz--md">
              <div className={styles.featureIcon}>🎯</div>
              <Heading as="h3">
                <Translate
                  id="homepage.feature.contextEconomy.title"
                  description="Context Economy feature title">
                  Context Economy
                </Translate>
              </Heading>
              <p>
                <Translate
                  id="homepage.feature.contextEconomy.description"
                  description="Context Economy feature description">
                  Specs under 300 lines. Read in 5-10 minutes. Fits in both human working memory 
                  and AI context windows. No more cognitive overload.
                </Translate>
              </p>
            </div>
          </div>
          <div className={clsx('col col--4')}>
            <div className="text--center padding-horiz--md">
              <div className={styles.featureIcon}>📈</div>
              <Heading as="h3">
                <Translate
                  id="homepage.feature.progressiveGrowth.title"
                  description="Progressive Growth feature title">
                  Progressive Growth
                </Translate>
              </Heading>
              <p>
                <Translate
                  id="homepage.feature.progressiveGrowth.description"
                  description="Progressive Growth feature description">
                  Start minimal. Add fields only when you feel pain. From solo dev to enterprise—one 
                  system that adapts to your needs, not the other way around.
                </Translate>
              </p>
            </div>
          </div>
          <div className={clsx('col col--4')}>
            <div className="text--center padding-horiz--md">
              <div className={styles.featureIcon}>🤖</div>
              <Heading as="h3">
                <Translate
                  id="homepage.feature.aiNative.title"
                  description="AI-Native feature title">
                  AI-Native
                </Translate>
              </Heading>
              <p>
                <Translate
                  id="homepage.feature.aiNative.description"
                  description="AI-Native feature description">
                  Works seamlessly with Cursor, Copilot, Aider, Claude Desktop (via MCP). 
                  Clear specs mean AI agents can actually implement your vision.
                </Translate>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
