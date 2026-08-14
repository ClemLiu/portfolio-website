import type { Meta, StoryObj } from "@storybook/react-vite";
import { LogoTargetWander } from "./LogoTargetWander";

const meta: Meta<typeof LogoTargetWander> = {
  title: "Components/Logo/Target Wander (archive)",
  component: LogoTargetWander,
  parameters: { layout: "centered" },
  argTypes: {
    frequencyX: {
      control: { type: "range", min: 0.005, max: 0.15, step: 0.005 },
      description: "Figma \"Frequency\" (horizontal) — center of the wander range",
    },
    frequencyY: {
      control: { type: "range", min: 0.01, max: 0.25, step: 0.005 },
      description: "Figma \"Frequency\" (vertical) — center of the wander range",
    },
    wiggle: {
      control: { type: "range", min: 0, max: 15, step: 0.5 },
      description: "Figma \"Wiggle\" — how far the line distorts",
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
      description: "Noise pattern \"character\" (static)",
    },
    wander: {
      control: { type: "range", min: 0.05, max: 1, step: 0.05 },
      description: "How far each random target can stray from center (0.5 = ±50%)",
    },
    ease: {
      control: { type: "range", min: 0.002, max: 0.08, step: 0.002 },
      description: "Lerp speed toward the current target — lower = slower/smoother drift",
    },
  },
  args: {
    frequencyX: 0.035,
    frequencyY: 0.09,
    wiggle: 3.5,
    smoothen: 1.2,
    octaves: 3,
    seed: 5,
    wander: 0.5,
    ease: 0.015,
  },
};

export default meta;
type Story = StoryObj<typeof LogoTargetWander>;

export const Default: Story = {
  render: (args) => (
    <div className="bg-paper p-10">
      <LogoTargetWander {...args} />
    </div>
  ),
};
