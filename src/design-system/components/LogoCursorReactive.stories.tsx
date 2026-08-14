import type { Meta, StoryObj } from "@storybook/react-vite";
import { LogoCursorReactive } from "./LogoCursorReactive";

const meta: Meta<typeof LogoCursorReactive> = {
  title: "Components/Logo/Cursor Reactive",
  component: LogoCursorReactive,
  parameters: { layout: "fullscreen" },
  argTypes: {
    frequencyX: {
      control: { type: "range", min: 0.005, max: 0.15, step: 0.005 },
      description: "Figma \"Frequency\" (horizontal) — center of the cursor range",
    },
    frequencyY: {
      control: { type: "range", min: 0.01, max: 0.25, step: 0.005 },
      description: "Figma \"Frequency\" (vertical) — center of the cursor range",
    },
    wiggle: {
      control: { type: "range", min: 0, max: 15, step: 0.5 },
      description: "Figma \"Wiggle\" — how far the line distorts (static)",
    },
    smoothen: {
      control: { type: "range", min: 0, max: 5, step: 0.1 },
      description: "Figma \"Smoothen\" — blur applied before displacing",
    },
    octaves: {
      control: { type: "range", min: 1, max: 5, step: 1 },
      description: "Noise quality/naturalness",
    },
    seed: {
      control: { type: "range", min: 0, max: 20, step: 1 },
      description: "Noise pattern \"character\" + bob-drift phase offset",
    },
    wander: {
      control: { type: "range", min: 0.05, max: 1, step: 0.05 },
      description: "How far the cursor can push frequency from center (0.5 = ±50%)",
    },
    ease: {
      control: { type: "range", min: 0.01, max: 0.3, step: 0.01 },
      description: "Follow speed — lower = laggier/smoother trail behind the cursor",
    },
    bobAmount: {
      control: { type: "range", min: 0, max: 20, step: 0.5 },
      description: "Idle bob — max vertical drift in pixels",
    },
    rotateAmount: {
      control: { type: "range", min: 0, max: 10, step: 0.25 },
      description: "Idle bob — max rotation in degrees, each direction",
    },
    noiseSpeed: {
      control: { type: "range", min: 0.02, max: 5, step: 0.02 },
      description: "How fast the idle bob moves through the noise field",
    },
    idleSpinSpeed: {
      control: { type: "range", min: 0, max: 200, step: 5 },
      description: "Gradient spin speed (deg/sec) while idle",
    },
    hoverSpinSpeed: {
      control: { type: "range", min: 0, max: 400, step: 5 },
      description: "Gradient spin speed (deg/sec) while cursor is over the logo",
    },
    spinEase: {
      control: { type: "range", min: 0.005, max: 0.2, step: 0.005 },
      description: "Lerp speed toward the target spin — lower = smoother speed-up/down",
    },
  },
  args: {
    frequencyX: 0.035,
    frequencyY: 0.09,
    wiggle: 3.5,
    smoothen: 1.2,
    octaves: 3,
    seed: 5,
    wander: 0.6,
    ease: 0.08,
    bobAmount: 4,
    rotateAmount: 1.5,
    noiseSpeed: 0.25,
    idleSpinSpeed: 20,
    hoverSpinSpeed: 90,
    spinEase: 0.03,
  },
};

export default meta;
type Story = StoryObj<typeof LogoCursorReactive>;

export const Default: Story = {
  args: {
    wiggle: 7,
    smoothen: 1.7,
    octaves: 4,
    noiseSpeed: 0.9,
    hoverSpinSpeed: 150
  },

  render: (args) => (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <LogoCursorReactive {...args} />
    </div>
  )
};
