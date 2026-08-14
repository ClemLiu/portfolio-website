import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tag } from "./Tag";

const meta: Meta<typeof Tag> = {
  title: "Components/Tag",
  component: Tag,
  parameters: { layout: "centered" },
  args: { children: "Product Design" },
};

export default meta;
type Story = StoryObj<typeof Tag>;

export const Default: Story = {
  render: (args) => (
    <div className="bg-paper-dark p-6">
      <Tag {...args} />
    </div>
  ),
};

export const Row: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 bg-paper-dark p-6">
      <Tag>Product Design</Tag>
      <Tag>Research</Tag>
      <Tag>Prototyping</Tag>
      <Tag>2026</Tag>
    </div>
  ),
};
