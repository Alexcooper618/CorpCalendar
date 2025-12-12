export interface ValidationError {
  property: string;
  constraints?: Record<string, string>;
}

export declare function IsString(): PropertyDecorator;
export declare function IsOptional(): PropertyDecorator;
export declare function IsDateString(): PropertyDecorator;
export declare function MinLength(length: number): PropertyDecorator;
export declare function validate(object: any): Promise<ValidationError[]>;
export declare function validateSync(object: any): ValidationError[];
