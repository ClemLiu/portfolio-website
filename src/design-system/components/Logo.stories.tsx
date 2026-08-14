import type { Meta, StoryObj } from "@storybook/react-vite";
import { Logo } from "./Logo";

const meta: Meta<typeof Logo> = {
  title: "Components/Logo",
  component: Logo,
  parameters: { layout: "centered" },
  argTypes: {
    bobAmount: {
      control: { type: "range", min: 0, max: 20, step: 0.5 },
      description: "Max vertical drift in pixels",
    },
    rotateAmount: {
      control: { type: "range", min: 0, max: 10, step: 0.25 },
      description: "Max rotation in degrees, each direction",
    },
    noiseSpeed: {
      control: { type: "range", min: 0.02, max: 5, step: 0.02 },
      description: "How fast the drift moves through the noise field",
    },
    seed: {
      control: { type: "range", min: 0, max: 20, step: 1 },
      description: "Phase offset — change for a different drift \"character\"",
    },
    hoverSpinSpeed: {
      control: { type: "range", min: 0, max: 360, step: 10 },
      description: "Degrees per second the gradient spins while hovered",
    },
  },
  args: {
    bobAmount: 4,
    rotateAmount: 1.5,
    noiseSpeed: 0.25,
    seed: 5,
    hoverSpinSpeed: 60,
  },
};

export default meta;
type Story = StoryObj<typeof Logo>;

export const Default: Story = {
  render: (args) => (
    <div className="bg-paper p-10">
      <Logo {...args} />
    </div>
  ),
};
