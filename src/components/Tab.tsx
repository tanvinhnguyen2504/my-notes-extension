import * as Tabs from '@radix-ui/react-tabs';

export function Tab() {
  return (
    <Tabs.Root defaultValue="tab1">
      <Tabs.List>
        <Tabs.Trigger value="tab1">Tasks</Tabs.Trigger>
        <Tabs.Trigger value="tab2">Dev</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="tab1"></Tabs.Content>
      <Tabs.Content value="tab2">Change your password here.</Tabs.Content>
    </Tabs.Root>
  );
}
