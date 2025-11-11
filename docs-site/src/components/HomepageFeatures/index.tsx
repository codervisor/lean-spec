import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import Translate from '@docusaurus/Translate';
import { HiOutlineLightBulb } from 'react-icons/hi';
import { TbRobotFace } from 'react-icons/tb';
import { BiGitBranch } from 'react-icons/bi';
import { MdSpeed } from 'react-icons/md';
import { IoGitNetworkOutline } from 'react-icons/io5';
import { RiFileMarkedLine } from 'react-icons/ri';
import styles from './styles.module.css';

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <div className={clsx('col col--4')}>
            <div className="text--center padding-horiz--md">
              <div className={styles.featureIcon}>
                <MdSpeed />
              </div>
              <Heading as="h3">
                <Translate
                  id="homepage.feature.velocity.title"
                  description="Ship Faster feature title">
                  Ship Faster
                </Translate>
              </Heading>
              <p>
                <Translate
                  id="homepage.feature.velocity.description"
                  description="Ship Faster feature description">
                  No heavyweight processes. No spec-first waterfall. Write specs as you code, 
                  capture decisions when they matter, ship when ready.
                </Translate>
              </p>
            </div>
          </div>
          <div className={clsx('col col--4')}>
            <div className="text--center padding-horiz--md">
              <div className={styles.featureIcon}>
                <HiOutlineLightBulb />
              </div>
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
                  Specs fit in working memory—both human and AI. Under 300 lines. Read in 5-10 minutes. 
                  Clear enough to implement, concise enough to maintain.
                </Translate>
              </p>
            </div>
          </div>
          <div className={clsx('col col--4')}>
            <div className="text--center padding-horiz--md">
              <div className={styles.featureIcon}>
                <TbRobotFace />
              </div>
              <Heading as="h3">
                <Translate
                  id="homepage.feature.aiNative.title"
                  description="AI-Native feature title">
                  AI-Native Design
                </Translate>
              </Heading>
              <p>
                <Translate
                  id="homepage.feature.aiNative.description"
                  description="AI-Native feature description">
                  Works seamlessly with Cursor, GitHub Copilot, Aider, and Claude Desktop (via MCP). 
                  AI agents can read, search, and implement from your specs—no manual context switching.
                </Translate>
              </p>
            </div>
          </div>
        </div>
        <div className="row">
          <div className={clsx('col col--4')}>
            <div className="text--center padding-horiz--md">
              <div className={styles.featureIcon}>
                <BiGitBranch />
              </div>
              <Heading as="h3">
                <Translate
                  id="homepage.feature.progressiveGrowth.title"
                  description="Progressive Growth feature title">
                  Start Simple, Scale Smart
                </Translate>
              </Heading>
              <p>
                <Translate
                  id="homepage.feature.progressiveGrowth.description"
                  description="Progressive Growth feature description">
                  Begin with just README.md and status tracking. Add structure only when needed. 
                  From solo dev to enterprise—grow with your team, not ahead of it.
                </Translate>
              </p>
            </div>
          </div>
          <div className={clsx('col col--4')}>
            <div className="text--center padding-horiz--md">
              <div className={styles.featureIcon}>
                <IoGitNetworkOutline />
              </div>
              <Heading as="h3">
                <Translate
                  id="homepage.feature.agile.title"
                  description="Agile & Adaptive feature title">
                  Agile & Adaptive
                </Translate>
              </Heading>
              <p>
                <Translate
                  id="homepage.feature.agile.description"
                  description="Agile & Adaptive feature description">
                  Adapt specs as you learn. No rigid upfront planning. Capture emerging insights. 
                  Respond to change faster than traditional documentation workflows.
                </Translate>
              </p>
            </div>
          </div>
          <div className={clsx('col col--4')}>
            <div className="text--center padding-horiz--md">
              <div className={styles.featureIcon}>
                <RiFileMarkedLine />
              </div>
              <Heading as="h3">
                <Translate
                  id="homepage.feature.tooling.title"
                  description="Rich Tooling feature title">
                  Rich Tooling Ecosystem
                </Translate>
              </Heading>
              <p>
                <Translate
                  id="homepage.feature.tooling.description"
                  description="Rich Tooling feature description">
                  CLI for workflow automation. MCP server for AI agents. VS Code extension. 
                  GitHub Actions for CI/CD. Extensible and composable toolchain.
                </Translate>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
