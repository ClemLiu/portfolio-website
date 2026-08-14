import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tokens } from "./Tokens";

const meta: Meta<typeof Tokens> = {
  title: "Foundations/Design Tokens",
  component: Tokens,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Tokens>;

export const Default: Story = {};
