/**
 * KOB Global Design System — the single entry point for shared UI.
 * Before building any new UI, import from here. If a primitive is missing,
 * add it in this folder instead of styling one page ad-hoc.
 */
export { Button, IconButton } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize, IconButtonProps } from "./Button";
export { Card, CardHeader, CardBody, CardFooter } from "./Card";
export { Badge, CountBadge, StatusDot } from "./Badge";
export type { BadgeTone } from "./Badge";
export { Field, Input, Textarea, Select } from "./Field";
export {
  SearchInput,
  PasswordInput,
  PhoneInput,
  NumberInput,
  DateInput,
  DateRangeInput,
  MultiSelect,
  FileUpload,
  OtpInput,
} from "./Inputs";
/** Canonical aliases — Date/DateRange pickers and the Switch control. */
export { DateInput as DatePicker, DateRangeInput as DateRangePicker } from "./Inputs";
export { Checkbox, Radio, RadioGroup, Toggle } from "./Controls";
export { Toggle as Switch } from "./Controls";
export { Alert } from "./Alert";
export type { AlertTone } from "./Alert";
export { Icon, ICON_SIZES } from "./Icon";
export type { IconSize } from "./Icon";
export {
  Text,
  Display,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Body,
  BodySmall,
  Caption,
  Label as TextLabel,
} from "./Typography";
export type { TextProps, TypeVariant, TypeTone } from "./Typography";
export { Modal, ConfirmDialog } from "./Modal";
export { Modal as Dialog } from "./Modal";
export {
  FormDialog,
  InformationDialog,
  WarningDialog,
  DangerDialog,
  FullScreenDialog,
  SideDrawer,
} from "./Dialogs";
export { InformationDialog as InfoDialog, SideDrawer as Drawer } from "./Dialogs";
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonMetrics,
  SkeletonTable,
  Spinner,
  LoadingBlock,
} from "./Skeleton";
export { EmptyState, ErrorState, LoadingState, RetryState, NoResultsState } from "./States";
export { Tabs } from "./Tabs";
export type { TabItem } from "./Tabs";
export { DataTable } from "./DataTable";
export type { Column } from "./DataTable";
export { Pagination } from "./Pagination";
export { Dropdown, DropdownItem, Tooltip } from "./Menu";
export {
  PageContainer,
  Section,
  SectionHeader,
  SectionFooter,
  StatCard,
  StatGrid,
  InfoCard,
  WarningCard,
} from "./Layout";
export { kobToast } from "./toast";
export { StatusBadge } from "@/components/common/StatusBadge";
export type { StatusTone } from "@/components/common/StatusBadge";
export { PageHeader } from "@/components/common/PageHeader";
export { MetricCard } from "@/components/common/MetricCard";
