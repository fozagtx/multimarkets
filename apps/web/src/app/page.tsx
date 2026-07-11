"use client";

/**
 * Argue landing
 * Conversion framework (landing-page-rewrite) + Soft Structuralism craft
 * Copy: concrete, no tech slop
 */

import React from "react";
import Image from "next/image";
import NextLink from "next/link";
import { Accordion, AccordionItem } from "@heroui/react";
import { Icon } from "@iconify/react";

import LandingFooter from "@/components/landing/landing-footer";
import FeatureCard from "@/components/landing/feature-card";
import { Reveal, RevealItem, RevealStagger } from "@/components/landing/reveal";
import ScrollMascot from "@/components/landing/scroll-mascot";
import BrandIcon from "@/components/brand-icon";
import { WalletConnectHeroPrimary } from "@/components/wallet-connect";
import WalletAuthRedirect from "@/components/wallet-auth-redirect";
import LiveArenasFeed from "@/components/live-arenas-feed";
import {
  differentiators,
  faqs,
  problems,
  solutions,
  steps,
  trustBadges,
} from "@/data/landing";

export default function HomePage() {
  return (
    <div className="lp light">
      <WalletAuthRedirect to="/markets" enabled />
      <div className="lp-mesh" aria-hidden />
      <div className="lp-grain" aria-hidden />
      <ScrollMascot />

      {/* 1. Hero */}
      <section className="pb-8 md:pb-12">
        <div className="lp-bezel w-full rounded-none">
          <div className="lp-bezel-core relative isolate overflow-hidden rounded-none px-5 pb-0 pt-10 sm:px-10 sm:pt-14 md:px-14 md:pt-16">
            <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
              <Image
                src="/bg.jpeg"
                alt=""
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/80 to-white/95" />
            </div>

            <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
              <BrandIcon size={56} className="shadow-[0_10px_30px_-12px_rgba(10,10,11,0.45)]" />

              <Reveal delay={0.06}>
                <h1 className="mt-7 text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[1.04] tracking-[-0.04em] text-[#0a0a0b]">
                  Stop betting on silence.{" "}
                  <span className="text-[#5B7CFA]">Trade the debate.</span>
                </h1>
              </Reveal>

              <Reveal delay={0.12}>
                <p className="mt-5 max-w-md text-[15px] font-medium leading-relaxed text-[#3f3f46] sm:max-w-lg sm:text-[17px] sm:leading-7">
                  Two characters. One question. Trade the argument.
                </p>
              </Reveal>

              <Reveal
                delay={0.18}
                className="mt-8 flex w-full max-w-sm flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center"
              >
                <WalletConnectHeroPrimary />
                <NextLink href="#problem" className="lp-btn lp-btn-ghost lp-btn-full">
                  Why this exists
                </NextLink>
              </Reveal>

              <Reveal delay={0.21} className="mt-7 w-full max-w-lg">
                <div className="rounded-[1.4rem] border border-white/40 bg-white/35 p-3 shadow-[0_18px_45px_-22px_rgba(9,18,38,0.65)] backdrop-blur-sm sm:p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_3.25rem_minmax(0,1fr)] sm:gap-3">
                    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/30 bg-[#101724] shadow-lg">
                      <Image
                        src="/trump-official-portrait.png"
                        alt="Donald Trump"
                        fill
                        priority
                        sizes="(max-width: 640px) 42vw, 230px"
                        className="object-cover object-center"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07101f]/90 to-transparent px-3 pb-3 pt-10 text-left">
                        <p className="text-xs font-bold tracking-[0.14em] text-white">TRUMP</p>
                      </div>
                    </div>
                    <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-[#07101f] text-xs font-black tracking-tight text-white shadow-lg sm:h-12 sm:w-12 sm:text-sm">
                      VS
                    </span>
                    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/30 bg-[#101724] shadow-lg">
                      <Image
                        src="/ansem-black-bull.webp"
                        alt="Ansem Black Bull avatar"
                        fill
                        priority
                        sizes="(max-width: 640px) 42vw, 230px"
                        className="object-cover object-center"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07101f]/90 to-transparent px-3 pb-3 pt-10 text-left">
                        <p className="text-xs font-bold tracking-[0.14em] text-white">ANSEM</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl bg-[#07101f] px-4 py-3 text-left">
                    <h2 className="text-base font-bold tracking-[-0.025em] text-white sm:text-lg">
                      ANSEM VS TRUMP
                    </h2>
                    <p className="mt-0.5 text-sm font-medium !text-white">
                      Who wins the memecoin race?
                    </p>
                    <NextLink
                      href="/create"
                      className="mt-3 inline-flex min-h-9 items-center rounded-full bg-white px-3.5 text-sm font-semibold text-[#0a0a0b] transition-[transform,background-color] duration-150 ease-out hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#07101f] active:scale-[0.98]"
                    >
                      Build this match
                    </NextLink>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.24} className="mt-8 flex flex-wrap items-center justify-center gap-2">
                {trustBadges.map((b) => (
                  <span
                    key={b.label}
                    className="rounded-full bg-[#f4f4f5] px-3 py-1.5 text-[11px] font-semibold text-[#3f3f46] ring-1 ring-black/[0.04]"
                  >
                    {b.label}
                  </span>
                ))}
              </Reveal>
            </div>

            <div className="relative mx-auto mt-10 w-full max-w-2xl pb-10 sm:mt-12 md:mt-14">
              <Reveal delay={0.2}>
                <LiveArenasFeed compact limit={4} />
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <div className="h-8 sm:h-10" aria-hidden />

      {/* 2. Problem */}
      <section id="problem" className="lp-section relative z-[1] bg-[#fafafa]">
        <div className="lp-container">
          <Reveal className="max-w-xl">
            <span className="lp-eyebrow">What is broken</span>
            <h2 className="mt-4 text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.03em] text-[#0a0a0b]">
              Prediction markets are boring until something is on stage
            </h2>
            <p className="mt-3 text-[15px] font-medium leading-relaxed text-[#3f3f46] sm:text-base">
              Three reasons people bounce from every other book.
            </p>
          </Reveal>

          <RevealStagger className="mt-12 grid grid-cols-1 gap-4 md:mt-14 md:grid-cols-3 md:gap-5">
            {problems.map((p) => (
              <RevealItem key={p.key}>
                <div className="lp-bento-shell h-full">
                  <div className="lp-bento-core flex h-full flex-col gap-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fef2f2] text-[#b91c1c]">
                      <Icon icon="solar:close-circle-linear" width={20} />
                    </span>
                    <h3 className="text-lg font-semibold tracking-tight text-[#0a0a0b]">
                      {p.title}
                    </h3>
                    <p className="text-sm font-medium leading-relaxed text-[#3f3f46]">{p.body}</p>
                    <p className="mt-auto pt-2 text-[13px] font-semibold text-[#0F766E]">
                      {p.fix}
                    </p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* 4. Solution */}
      <section id="features" className="lp-section relative z-[1] bg-white">
        <div className="lp-container">
          <Reveal className="max-w-xl">
            <span className="lp-eyebrow">The fix</span>
            <h2 className="mt-4 text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.03em] text-[#0a0a0b]">
              One room. Match, market, finish.
            </h2>
            <p className="mt-3 text-[15px] font-medium leading-relaxed text-[#3f3f46] sm:text-base">
              Same three pains, three clean answers.
            </p>
          </Reveal>

          <RevealStagger
            stagger={0.12}
            className="mt-12 grid grid-cols-1 gap-4 md:mt-14 md:grid-cols-12 md:gap-5"
          >
            <RevealItem className="md:col-span-7 md:row-span-2">
              <FeatureCard
                featured
                icon={solutions[0].icon}
                title={solutions[0].title}
                description={`${solutions[0].metric}. ${solutions[0].description}`}
              />
            </RevealItem>
            <RevealItem className="md:col-span-5">
              <FeatureCard
                icon={solutions[1].icon}
                title={solutions[1].title}
                description={`${solutions[1].metric}. ${solutions[1].description}`}
              />
            </RevealItem>
            <RevealItem className="md:col-span-5">
              <FeatureCard
                icon={solutions[2].icon}
                title={solutions[2].title}
                description={`${solutions[2].metric}. ${solutions[2].description}`}
              />
            </RevealItem>
          </RevealStagger>
        </div>
      </section>

      {/* 5. How it works */}
      <section id="how" className="lp-section relative z-[1] bg-[#fafafa]">
        <div className="lp-container">
          <Reveal className="max-w-xl">
            <span className="lp-eyebrow">How it works</span>
            <h2 className="mt-4 text-[clamp(1.75rem,4vw,2.5rem)] font-bold tracking-[-0.03em] text-[#0a0a0b]">
              From connect to cash-out in four moves
            </h2>
          </Reveal>

          <RevealStagger className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <RevealItem key={s.n}>
                <div className="lp-bento-shell h-full">
                  <div className="lp-bento-core flex h-full flex-col gap-3">
                    <span className="font-mono text-[13px] font-semibold text-[#5B7CFA]">
                      {s.n}
                    </span>
                    <h3 className="text-lg font-semibold tracking-tight text-[#0a0a0b]">{s.t}</h3>
                    <p className="text-sm font-medium leading-relaxed text-[#3f3f46]">{s.d}</p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* 6. Differentiators */}
      <section id="why" className="lp-section relative z-[1] bg-white">
        <div className="lp-container">
          <Reveal className="max-w-xl">
            <span className="lp-eyebrow">Why not just…</span>
            <h2 className="mt-4 text-[clamp(1.75rem,4vw,2.5rem)] font-bold tracking-[-0.03em] text-[#0a0a0b]">
              Chat and charts alone will not do this
            </h2>
          </Reveal>

          <RevealStagger className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
            {differentiators.map((d) => (
              <RevealItem key={d.key}>
                <div className="lp-bento-shell h-full">
                  <div className="lp-bento-core flex h-full flex-col gap-3">
                    <h3 className="text-lg font-semibold tracking-tight text-[#0a0a0b]">
                      {d.title}
                    </h3>
                    <p className="text-sm font-medium leading-relaxed text-[#3f3f46]">{d.body}</p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* 7. FAQ */}
      <section id="faq" className="lp-section relative z-[1] bg-[#fafafa]">
        <div className="lp-container max-w-3xl">
          <Reveal className="text-center">
            <span className="lp-eyebrow">FAQ</span>
            <h2 className="mt-4 text-[clamp(1.75rem,4vw,2.5rem)] font-bold tracking-[-0.03em] text-[#0a0a0b]">
              Before you open a room
            </h2>
          </Reveal>

          <Reveal delay={0.08} className="mt-10">
            <div className="lp-bezel">
              <div className="lp-bezel-core px-2 py-2 sm:px-4 sm:py-3">
                <Accordion
                  selectionMode="multiple"
                  itemClasses={{
                    title: "text-[15px] font-semibold text-[#0a0a0b]",
                    content: "text-[14px] font-medium leading-relaxed text-[#3f3f46] pb-4",
                    trigger: "py-4 px-3",
                  }}
                >
                  {faqs.map((f) => (
                    <AccordionItem key={f.q} title={f.q} aria-label={f.q}>
                      {f.a}
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 8. Final CTA — black buttons on light panel */}
      <section className="lp-section relative z-[1] bg-[#fafafa]">
        <div className="lp-container">
          <Reveal>
            <div className="lp-bezel">
              <div className="lp-bezel-core relative overflow-hidden bg-white px-6 py-14 text-center sm:px-12 sm:py-20">
                <div
                  className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-[#5B7CFA]/12 blur-3xl"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-[#7C6CF5]/10 blur-3xl"
                  aria-hidden
                />
                <p className="relative text-[10px] font-semibold uppercase tracking-[0.2em] text-[#71717a]">
                  Your move
                </p>
                <h2 className="relative mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.03em] text-[#0a0a0b]">
                  See the fight. Trade the finish.
                </h2>
                <p className="relative mx-auto mt-3 max-w-md text-[15px] font-medium text-[#3f3f46]">
                  Connect, pick two characters, set a yes/no question, open the room.
                </p>
                <div className="relative mx-auto mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
                  <NextLink
                    href="/create"
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#0a0a0b] py-3 pl-6 pr-2 text-[15px] font-semibold text-white shadow-[0_12px_32px_-12px_rgba(10,10,11,0.45)] transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-[#18181b] active:scale-[0.98]"
                  >
                    Create match
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/12 transition-transform duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105">
                      <Icon icon="solar:arrow-right-up-linear" width={15} />
                    </span>
                  </NextLink>
                  <NextLink
                    href="/markets"
                    className="inline-flex items-center justify-center rounded-full border border-[#0a0a0b] bg-[#0a0a0b] px-6 py-3 text-[15px] font-semibold text-white transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-[#18181b] active:scale-[0.98]"
                  >
                    Browse markets
                  </NextLink>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
