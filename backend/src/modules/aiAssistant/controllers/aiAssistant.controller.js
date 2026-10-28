import { askAiAssistantService } from "../services/aiAssistant.service.js";
import { ApiResponse } from "../../../shared/responses/ApiResponse.js";

/**
 * Controller for learner asking a question to the AI Assistant.
 */
export async function askAssistant(req, res) {
    const learnerId = req.user._id || req.user.id;
    const body = req.validatedBody || req.body;

    const result = await askAiAssistantService({
        learnerId,
        question: body.question,
        courseId: body.courseId,
        topicId: body.topicId,
        lessonId: body.lessonId,
        history: body.history,
    });

    res.status(200).json(
        new ApiResponse(result, "AI Assistant response generated successfully")
    );
}
