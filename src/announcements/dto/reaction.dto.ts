import { IsEnum, IsNotEmpty } from "class-validator";
import { ReactionType } from "../entities/announcements-reaction.entities";

export class AddReactionDto {
    @IsNotEmpty()
    @IsEnum(ReactionType, {
        message: 'Reaction harus like, love, haha, wow, sad, atau angry'
    })
    reactionType: ReactionType;
}