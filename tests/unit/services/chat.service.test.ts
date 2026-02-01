import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { chatService } from "@/src/features/chat/services/chat.service";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("ChatService", () => {
  let mockChain: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockChain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      then: vi.fn().mockImplementation((onfulfilled) => {
        return Promise.resolve(onfulfilled({ data: [], error: null }));
      }),
    };

    (supabase.from as Mock).mockReturnValue(mockChain);
  });

  describe("getTaskMessages", () => {
    it("should fetch all messages for a task", async () => {
      await chatService.getTaskMessages("t1");
      expect(mockChain.eq).toHaveBeenCalledWith("task_id", "t1");
    });

    it("should throw on failure", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(
          onfulfilled({ data: null, error: { message: "Fail" } }),
        );
      });
      await expect(chatService.getTaskMessages("t1")).rejects.toThrow();
    });
  });

  describe("sendMessage", () => {
    it("should insert a message", async () => {
      const dto = {
        task_id: "t1",
        org_id: "o1",
        sender_id: "u1",
        content: "Hi",
      };
      mockChain.single.mockResolvedValueOnce({
        data: { id: "m1", ...dto },
        error: null,
      });
      const result = await chatService.sendMessage(dto);
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ content: "Hi" }),
      );
      expect(result.id).toBe("m1");
    });

    it("should throw on failure", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Fail" },
      });
      await expect(chatService.sendMessage({} as any)).rejects.toThrow();
    });
  });

  describe("getExternalMessages", () => {
    it("should filter by is_internal=false", async () => {
      await chatService.getExternalMessages("t1");
      expect(mockChain.eq).toHaveBeenCalledWith("is_internal", false);
    });
  });

  describe("getInternalMessages", () => {
    it("should filter by is_internal=true", async () => {
      await chatService.getInternalMessages("t1");
      expect(mockChain.eq).toHaveBeenCalledWith("is_internal", true);
    });
  });
});
