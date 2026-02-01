import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { NotificationsService } from "@/src/features/notifications/services/notifications.service";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("NotificationsService", () => {
  let service: NotificationsService;
  let mockChain: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationsService();

    mockChain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      then: vi.fn().mockImplementation((onfulfilled) => {
        return Promise.resolve(onfulfilled({ data: [], error: null }));
      }),
    };

    (supabase.from as Mock).mockReturnValue(mockChain);
  });

  describe("fetchNotifications", () => {
    it("should fetch and count unread", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(onfulfilled({
          data: [{ id: "n1", is_read: false }, { id: "n2", is_read: true }],
          error: null,
        }));
      });

      const result = await service.fetchNotifications({ userId: "u1" });
      expect(result.notifications).toHaveLength(2);
      expect(result.unreadCount).toBe(1);
    });

    it("should throw on failure", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(
          onfulfilled({ data: null, error: { message: "Fail" } }),
        );
      });
      await expect(service.fetchNotifications({ userId: "u1" })).rejects
        .toThrow();
    });
  });

  describe("createNotification", () => {
    it("should insert single notification", async () => {
      const dto = {
        org_id: "o1",
        user_id: "u1",
        title: "T",
        message: "M",
        type: "INFO",
      };
      mockChain.single.mockResolvedValueOnce({
        data: { id: "n1", ...dto },
        error: null,
      });
      const result = await service.createNotification(dto);
      expect(mockChain.insert).toHaveBeenCalled();
      expect(result.id).toBe("n1");
    });

    it("should throw on creation failure", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Fail" },
      });
      await expect(service.createNotification({} as any)).rejects.toThrow();
    });
  });

  describe("sendSystemNotification", () => {
    it("should call createNotification", async () => {
      service.createNotification = vi.fn().mockResolvedValue({ id: "n1" });
      await service.sendSystemNotification("o1", "u1", "a1", "T", "M", "INFO");
      expect(service.createNotification).toHaveBeenCalled();
    });
  });

  describe("notifyMultiple", () => {
    it("should insert multiple if userIds provided", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(onfulfilled({ error: null }));
      });
      await service.notifyMultiple("o1", ["u1", "u2"], "a1", "T", "M", "INFO");
      const calls = mockChain.insert.mock.calls[0][0];
      expect(calls).toHaveLength(2);
      expect(calls[0].user_id).toBe("u1");
      expect(calls[1].user_id).toBe("u2");
    });

    it("should return early if no users", async () => {
      await service.notifyMultiple("o1", [], "a1", "T", "M", "INFO");
      expect(mockChain.insert).not.toHaveBeenCalled();
    });

    it("should throw on bulk failure", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(onfulfilled({ error: { message: "Fail" } }));
      });
      await expect(service.notifyMultiple("o1", ["u1"], "a1", "T", "M", "INFO"))
        .rejects.toThrow();
    });
  });

  describe("markAsRead", () => {
    it("should update is_read", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(onfulfilled({ error: null }));
      });
      await service.markAsRead("n1");
      expect(mockChain.update).toHaveBeenCalledWith({ is_read: true });
      expect(mockChain.eq).toHaveBeenCalledWith("id", "n1");
    });

    it("should throw on mark failure", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(onfulfilled({ error: { message: "Fail" } }));
      });
      await expect(service.markAsRead("n1")).rejects.toThrow();
    });
  });

  describe("markAllAsRead", () => {
    it("should update all unread for user", async () => {
      mockChain.then.mockImplementationOnce((onfulfilled) => {
        return Promise.resolve(onfulfilled({ error: null }));
      });
      await service.markAllAsRead("u1");
      expect(mockChain.eq).toHaveBeenCalledWith("user_id", "u1");
      expect(mockChain.eq).toHaveBeenCalledWith("is_read", false);
    });
  });
});
