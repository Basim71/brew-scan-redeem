import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowDown,
  Coffee,
  LogIn,
  Mouse,
} from "lucide-react";

import {
  LanguageSwitcher,
  useI18n,
} from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: Index,
});

const TOTAL_STAGES = 7;

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.min(
    Math.max(value, min),
    max,
  );
}

function smoothStep(
  start: number,
  end: number,
  value: number,
) {
  const progress = clamp(
    (value - start) /
      Math.max(end - start, 0.0001),
    0,
    1,
  );

  return (
    progress *
    progress *
    (3 - 2 * progress)
  );
}

function rangeProgress(
  progress: number,
  start: number,
  end: number,
) {
  return smoothStep(
    start,
    end,
    progress,
  );
}

function stageOpacity(
  progress: number,
  enter: number,
  hold: number,
  exit: number,
) {
  const enterOpacity =
    rangeProgress(
      progress,
      enter,
      hold,
    );

  const exitOpacity =
    1 -
    rangeProgress(
      progress,
      hold,
      exit,
    );

  return Math.min(
    enterOpacity,
    exitOpacity,
  );
}

function Index() {
  const { t } = useI18n();

  const storyRef =
    useRef<HTMLDivElement | null>(null);

  const [progress, setProgress] =
    useState(0);

  const [viewportHeight, setViewportHeight] =
    useState(900);

  useEffect(() => {
    const updateViewport = () => {
      setViewportHeight(
        window.innerHeight,
      );
    };

    updateViewport();

    window.addEventListener(
      "resize",
      updateViewport,
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateViewport,
      );
    };
  }, []);

  useEffect(() => {
    let frameId = 0;

    const updateProgress = () => {
      if (!storyRef.current) {
        return;
      }

      const rect =
        storyRef.current.getBoundingClientRect();

      const storyHeight =
        storyRef.current.offsetHeight;

      const scrollableDistance =
        storyHeight - window.innerHeight;

      const travelled = -rect.top;

      const nextProgress = clamp(
        travelled /
          Math.max(
            scrollableDistance,
            1,
          ),
        0,
        1,
      );

      setProgress(nextProgress);
    };

    const handleScroll = () => {
      cancelAnimationFrame(frameId);

      frameId =
        requestAnimationFrame(
          updateProgress,
        );
    };

    updateProgress();

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      },
    );

    return () => {
      cancelAnimationFrame(frameId);

      window.removeEventListener(
        "scroll",
        handleScroll,
      );
    };
  }, []);

  const activeStage = Math.min(
    Math.floor(
      progress *
        TOTAL_STAGES,
    ),
    TOTAL_STAGES - 1,
  );

  return (
    <main className="kob-apple-home">
      <header className="kob-home-header">
        <div className="kob-home-header-inner">
          <Link
            to="/"
            className="kob-home-brand"
          >
            <div className="kob-home-logo-icon">
              <Coffee className="h-5 w-5" />
            </div>

            <div>
              <div className="kob-home-logo-title">
                KOB
              </div>

              <div className="kob-home-logo-subtitle">
                {t("brand_tag")}
              </div>
            </div>
          </Link>

          <div className="kob-home-actions">
            <LanguageSwitcher />

            <Link
              to="/auth"
              className="kob-home-login"
            >
              <LogIn className="h-4 w-4" />

              <span>
                {t("staff_login")}
              </span>
            </Link>
          </div>
        </div>
      </header>

      <div
        ref={storyRef}
        className="kob-scroll-story"
        style={
          {
            "--story-height":
              `${Math.max(
                viewportHeight *
                  TOTAL_STAGES,
                5000,
              )}px`,
          } as CSSProperties
        }
      >
        <section className="kob-sticky-stage">
          <StoryBackground
            progress={progress}
          />

          <StoryNavigation
            progress={progress}
            activeStage={activeStage}
          />

          <StoryCopy
            progress={progress}
          />

          <div className="kob-stage-center">
            <LogoScene
              progress={progress}
            />

            <SubscriptionScene
              progress={progress}
            />

            <BeansScene
              progress={progress}
            />

            <GroundCoffeeScene
              progress={progress}
            />

            <MachineScene
              progress={progress}
            />

            <CupScene
              progress={progress}
            />

            <TopViewScene
              progress={progress}
            />
          </div>

          <ScrollHint
            progress={progress}
          />
        </section>
      </div>

      <section className="kob-home-final-cta">
        <div className="kob-home-final-glow" />

        <div className="kob-home-final-content">
          <div className="kob-final-logo">
            KOB
          </div>

          <h2>
            Smart Coffee Subscription
          </h2>

          <p>
            Every subscription,
            under control.
          </p>

          <Link
            to="/scan"
            className="btn-brass px-7 py-3"
          >
            Start now
          </Link>
        </div>
      </section>
    </main>
  );
}

function StoryBackground({
  progress,
}: {
  progress: number;
}) {
  const glowX =
    50 +
    Math.sin(
      progress * Math.PI * 2,
    ) *
      12;

  const glowY =
    42 +
    progress * 22;

  return (
    <div
      className="kob-story-background"
      style={
        {
          "--glow-x": `${glowX}%`,
          "--glow-y": `${glowY}%`,
        } as CSSProperties
      }
    >
      <div className="kob-story-vignette" />
      <div className="kob-story-noise" />
      <div className="kob-story-floor" />
    </div>
  );
}

function StoryNavigation({
  progress,
  activeStage,
}: {
  progress: number;
  activeStage: number;
}) {
  const labels = [
    "KOB",
    "Subscription",
    "Beans",
    "Grinding",
    "Brewing",
    "Your Cup",
    "The Mark",
  ];

  return (
    <aside className="kob-story-navigation">
      <div className="kob-story-stage-number">
        {String(
          activeStage + 1,
        ).padStart(2, "0")}
      </div>

      <div className="kob-story-stage-line" />

      <div className="kob-story-stage-label">
        {labels[activeStage]}
      </div>

      <div className="kob-story-progress-track">
        <div
          className="kob-story-progress-fill"
          style={{
            height:
              `${progress * 100}%`,
          }}
        />
      </div>

      <Mouse className="kob-story-mouse-icon" />
    </aside>
  );
}

function StoryCopy({
  progress,
}: {
  progress: number;
}) {
  const stages = useMemo(
    () => [
      {
        title:
          "A smarter coffee experience.",
        body:
          "One system controls every subscription, every day, and every cup.",
      },
      {
        title:
          "Your subscription, beautifully simple.",
        body:
          "A premium digital card that follows the customer wherever they go.",
      },
      {
        title:
          "Every journey begins with a bean.",
        body:
          "The subscription transforms into the coffee experience itself.",
      },
      {
        title:
          "Precision in every detail.",
        body:
          "Fresh beans are ground at exactly the right moment.",
      },
      {
        title:
          "Crafted and prepared instantly.",
        body:
          "The order reaches the coffee machine and becomes a real cup.",
      },
      {
        title:
          "Your daily coffee is ready.",
        body:
          "Fast for customers, effortless for coffee shops.",
      },
      {
        title:
          "Every cup carries your brand.",
        body:
          "KOB turns subscription management into a premium customer experience.",
      },
    ],
    [],
  );

  return (
    <div className="kob-story-copy">
      {stages.map(
        (
          stage,
          index,
        ) => {
          const center =
            index /
            (TOTAL_STAGES - 1);

          const distance =
            Math.abs(
              progress -
                center,
            );

          const opacity =
            clamp(
              1 -
                distance *
                  8,
              0,
              1,
            );

          const translateY =
            (
              progress -
              center
            ) *
            -100;

          return (
            <div
              key={stage.title}
              className="kob-story-copy-item"
              style={{
                opacity,
                transform:
                  `translateY(${translateY}px)`,
                pointerEvents:
                  opacity > 0.8
                    ? "auto"
                    : "none",
              }}
            >
              <div className="kob-story-copy-eyebrow">
                KOB Coffee System
              </div>

              <h1>
                {stage.title}
              </h1>

              <p>
                {stage.body}
              </p>
            </div>
          );
        },
      )}
    </div>
  );
}

function LogoScene({
  progress,
}: {
  progress: number;
}) {
  const exit =
    rangeProgress(
      progress,
      0.04,
      0.15,
    );

  const opacity =
    1 - exit;

  const scale =
    1 + exit * 0.22;

  const blur =
    exit * 18;

  return (
    <div
      className="kob-scene kob-logo-scene"
      style={{
        opacity,
        filter:
          `blur(${blur}px)`,
        transform:
          `scale(${scale}) translateY(${
            -exit * 60
          }px)`,
      }}
    >
      <div className="kob-logo-halo" />

      <div className="kob-hero-logo-mark">
        <Coffee />
      </div>

      <div className="kob-hero-logo-word">
        KOB
      </div>

      <div className="kob-hero-logo-caption">
        Smart Coffee Subscription
      </div>
    </div>
  );
}

function SubscriptionScene({
  progress,
}: {
  progress: number;
}) {
  const opacity =
    stageOpacity(
      progress,
      0.08,
      0.15,
      0.3,
    );

  const enter =
    rangeProgress(
      progress,
      0.08,
      0.15,
    );

  const transformToBeans =
    rangeProgress(
      progress,
      0.22,
      0.31,
    );

  const rotateX =
    14 -
    enter * 14 +
    transformToBeans * 18;

  const rotateY =
    -18 +
    enter * 18;

  const scale =
    0.72 +
    enter * 0.28 -
    transformToBeans * 0.18;

  return (
    <div
      className="kob-scene kob-card-scene"
      style={{
        opacity,
        transform:
          `perspective(1400px)
           rotateX(${rotateX}deg)
           rotateY(${rotateY}deg)
           scale(${scale})
           translateY(${
             (1 - enter) *
               100 -
             transformToBeans *
               40
           }px)`,
      }}
    >
      <div className="kob-membership-card">
        <div className="kob-membership-shine" />

        <div className="kob-membership-top">
          <div>
            <span>
              KOB
            </span>

            <small>
              SMART COFFEE
            </small>
          </div>

          <Coffee />
        </div>

        <div className="kob-membership-center">
          <div className="kob-membership-bean">
            <span />
          </div>
        </div>

        <div className="kob-membership-bottom">
          <div>
            <small>
              PREMIUM
            </small>

            <strong>
              MEMBERSHIP
            </strong>
          </div>

          <span>
            0001
          </span>
        </div>
      </div>
    </div>
  );
}

function BeansScene({
  progress,
}: {
  progress: number;
}) {
  const opacity =
    stageOpacity(
      progress,
      0.23,
      0.31,
      0.49,
    );

  const spread =
    rangeProgress(
      progress,
      0.25,
      0.37,
    );

  const fall =
    rangeProgress(
      progress,
      0.4,
      0.51,
    );

  const beans =
    useMemo(
      () =>
        Array.from({
          length: 42,
        }).map((_, index) => {
          const angle =
            (index / 42) *
              Math.PI *
              2 +
            (index % 5) *
              0.18;

          const radius =
            80 +
            (index % 9) *
              19;

          return {
            x:
              Math.cos(angle) *
              radius,

            y:
              Math.sin(angle) *
                radius *
                0.62 -
              10,

            rotation:
              (index * 47) %
              180,

            scale:
              0.65 +
              (index % 6) *
                0.09,

            delay:
              (index % 8) *
              0.015,
          };
        }),
      [],
    );

  return (
    <div
      className="kob-scene kob-beans-scene"
      style={{
        opacity,
      }}
    >
      {beans.map(
        (
          bean,
          index,
        ) => {
          const localSpread =
            clamp(
              spread -
                bean.delay,
              0,
              1,
            );

          return (
            <span
              key={index}
              className="kob-coffee-bean"
              style={{
                opacity:
                  clamp(
                    localSpread *
                      1.5 -
                      fall *
                        0.7,
                    0,
                    1,
                  ),

                transform:
                  `translate3d(
                    ${
                      bean.x *
                      localSpread
                    }px,
                    ${
                      bean.y *
                        localSpread +
                      fall *
                        (260 +
                          (index %
                            5) *
                            22)
                    }px,
                    0
                  )
                  rotate(${
                    bean.rotation +
                    spread *
                      140 +
                    fall *
                      220
                  }deg)
                  scale(${
                    bean.scale *
                    (0.5 +
                      localSpread *
                        0.5)
                  })`,
              }}
            >
              <i />
            </span>
          );
        },
      )}
    </div>
  );
}

function GroundCoffeeScene({
  progress,
}: {
  progress: number;
}) {
  const opacity =
    stageOpacity(
      progress,
      0.4,
      0.49,
      0.65,
    );

  const grind =
    rangeProgress(
      progress,
      0.45,
      0.58,
    );

  const particles =
    useMemo(
      () =>
        Array.from({
          length: 90,
        }).map((_, index) => ({
          x:
            ((index * 73) %
              240) -
            120,

          y:
            ((index * 41) %
              180) -
            90,

          size:
            2 +
            (index % 4),

          rotation:
            (index * 31) %
            180,

          delay:
            (index % 12) *
            0.01,
        })),
      [],
    );

  return (
    <div
      className="kob-scene kob-ground-scene"
      style={{
        opacity,
      }}
    >
      <div className="kob-grinder-ring">
        <div className="kob-grinder-inner">
          <div
            className="kob-grinder-blade"
            style={{
              transform:
                `rotate(${
                  grind *
                  720
                }deg)`,
            }}
          />

          <div
            className="kob-grinder-blade kob-grinder-blade-two"
            style={{
              transform:
                `rotate(${
                  grind *
                    -620 +
                  90
                }deg)`,
            }}
          />
        </div>
      </div>

      <div className="kob-ground-particles">
        {particles.map(
          (
            particle,
            index,
          ) => {
            const local =
              clamp(
                grind -
                  particle.delay,
                0,
                1,
              );

            return (
              <span
                key={index}
                style={{
                  width:
                    `${particle.size}px`,
                  height:
                    `${particle.size}px`,
                  opacity:
                    local,
                  transform:
                    `translate3d(
                      ${
                        particle.x *
                        local
                      }px,
                      ${
                        particle.y *
                          local +
                        local *
                          80
                      }px,
                      0
                    )
                    rotate(${
                      particle.rotation +
                      local *
                        180
                    }deg)`,
                }}
              />
            );
          },
        )}
      </div>

      <div className="kob-portafilter">
        <div className="kob-portafilter-basket">
          <div
            className="kob-coffee-powder"
            style={{
              transform:
                `scaleY(${grind})`,
              opacity:
                grind,
            }}
          />
        </div>

        <div className="kob-portafilter-handle" />
      </div>
    </div>
  );
}

function MachineScene({
  progress,
}: {
  progress: number;
}) {
  const opacity =
    stageOpacity(
      progress,
      0.55,
      0.63,
      0.82,
    );

  const machineEnter =
    rangeProgress(
      progress,
      0.55,
      0.65,
    );

  const coffeeFlow =
    rangeProgress(
      progress,
      0.66,
      0.78,
    );

  return (
    <div
      className="kob-scene kob-machine-scene"
      style={{
        opacity,
        transform:
          `translateY(${
            (1 -
              machineEnter) *
            -90
          }px)`,
      }}
    >
      <div className="kob-machine-body">
        <div className="kob-machine-highlight" />

        <div className="kob-machine-display">
          KOB
        </div>

        <div className="kob-machine-controls">
          <span />
          <span />
          <span />
        </div>

        <div className="kob-machine-group">
          <div className="kob-machine-head" />

          <div className="kob-machine-handle" />

          <div className="kob-machine-spouts">
            <span />
            <span />
          </div>
        </div>
      </div>

      <div className="kob-coffee-streams">
        <span
          style={{
            height:
              `${coffeeFlow * 160}px`,
            opacity:
              coffeeFlow,
          }}
        />

        <span
          style={{
            height:
              `${coffeeFlow * 160}px`,
            opacity:
              coffeeFlow,
          }}
        />
      </div>
    </div>
  );
}

function CupScene({
  progress,
}: {
  progress: number;
}) {
  const opacity =
    stageOpacity(
      progress,
      0.66,
      0.78,
      0.94,
    );

  const enter =
    rangeProgress(
      progress,
      0.67,
      0.78,
    );

  const slide =
    rangeProgress(
      progress,
      0.82,
      0.93,
    );

  const fill =
    rangeProgress(
      progress,
      0.7,
      0.84,
    );

  return (
    <div
      className="kob-scene kob-cup-scene"
      style={{
        opacity,
        transform:
          `translate3d(
            ${
              slide * 220
            }px,
            ${
              (1 - enter) *
                180 -
              slide * 40
            }px,
            0
          )
          scale(${
            0.75 +
            enter * 0.25 -
            slide * 0.08
          })`,
      }}
    >
      <CoffeeCup
        fill={fill}
      />
    </div>
  );
}

function TopViewScene({
  progress,
}: {
  progress: number;
}) {
  const enter =
    rangeProgress(
      progress,
      0.86,
      0.98,
    );

  const opacity = enter;

  return (
    <div
      className="kob-scene kob-top-view-scene"
      style={{
        opacity,
        transform:
          `scale(${
            0.7 +
            enter * 0.3
          })
          rotateX(${
            65 -
            enter * 65
          }deg)`,
      }}
    >
      <div className="kob-top-cup-shadow" />

      <div className="kob-top-cup">
        <div className="kob-top-coffee">
          <div className="kob-latte-logo">
            <span>
              KOB
            </span>

            <small>
              COFFEE
            </small>
          </div>
        </div>

        <div className="kob-top-handle" />
      </div>
    </div>
  );
}

function CoffeeCup({
  fill,
}: {
  fill: number;
}) {
  return (
    <div className="kob-cup-wrapper">
      <div className="kob-cup-steam">
        <span />
        <span />
        <span />
      </div>

      <div className="kob-cup">
        <div className="kob-cup-rim">
          <div
            className="kob-cup-liquid"
            style={{
              opacity: fill,
              transform:
                `scaleY(${fill})`,
            }}
          >
            <div className="kob-crema-ring" />
          </div>
        </div>

        <div className="kob-cup-logo">
          <Coffee />
          <span>
            KOB
          </span>
        </div>

        <div className="kob-cup-handle" />
      </div>

      <div className="kob-saucer" />
    </div>
  );
}

function ScrollHint({
  progress,
}: {
  progress: number;
}) {
  return (
    <div
      className="kob-scroll-hint"
      style={{
        opacity:
          1 -
          rangeProgress(
            progress,
            0,
            0.08,
          ),
      }}
    >
      <Mouse className="h-5 w-5" />

      <span>
        Scroll to explore
      </span>

      <ArrowDown className="h-4 w-4 animate-bounce" />
    </div>
  );
}
