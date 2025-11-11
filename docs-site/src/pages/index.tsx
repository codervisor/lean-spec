import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <img 
          src="/img/logo-with-bg.svg" 
          alt={translate({
            message: 'LeanSpec Logo',
            id: 'homepage.logo.alt',
            description: 'Alt text for the LeanSpec logo on homepage'
          })}
          className={styles.heroLogo}
        />
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">
          <Translate
            id="homepage.tagline"
            description="The homepage tagline">
            Lightweight spec methodology for AI-powered development
          </Translate>
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/guide/getting-started">
            <Translate
              id="homepage.getStarted"
              description="Get Started button on homepage">
              Get Started →
            </Translate>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - ${translate({
        message: 'Lightweight spec methodology for AI-powered development',
        id: 'homepage.metaTagline',
        description: 'The homepage meta tagline'
      })}`}
      description={translate({
        message: 'Lightweight spec methodology for AI-powered development',
        id: 'homepage.metaDescription',
        description: 'The homepage meta description'
      })}>
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
