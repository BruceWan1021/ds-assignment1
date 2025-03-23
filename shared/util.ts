import { marshall } from "@aws-sdk/util-dynamodb";
import { Team } from "./types"; 

type Entity = Team; 

export const generateItem = (entity: Entity) => {
  return {
    PutRequest: {
      Item: marshall(entity), 
    },
  };
};

export const generateBatch = (data: Entity[]) => {
  return data.map((e) => generateItem(e));
};