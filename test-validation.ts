import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { GenerateWorksheetDto } from './apps/api/src/worksheets/dto/generate-worksheet.dto';

async function test() {
  const payload = {
    dataSource: "MANUAL",
    type: "ACTIVITY",
    targetDomains: ["Communication", "Social-Emotional"],
    difficulty: "FOUNDATIONAL",
    setting: "HOME",
    duration: "5min",
    colorMode: "FULL_COLOR",
    interests: "barbie",
    specialInstructions: "make it engaging",
    manualInput: {
      childAge: 4
    }
  };

  const dto = plainToInstance(GenerateWorksheetDto, payload);
  const errors = await validate(dto);
  
  if (errors.length > 0) {
    console.log("VALIDATION ERRORS:");
    console.log(JSON.stringify(errors.map(e => ({
      property: e.property,
      constraints: e.constraints,
      children: e.children?.map((c: any) => ({
        property: c.property,
        constraints: c.constraints
      }))
    })), null, 2));
  } else {
    console.log("VALIDATION PASSED");
  }
}

test().catch(console.error);
