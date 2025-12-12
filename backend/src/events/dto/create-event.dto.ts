export class CreateEventDto {
  title!: string;
  owner?: string;
  dept?: string;
  startDate!: string;
  endDate!: string;
  color?: string;
  comment?: string;
}
