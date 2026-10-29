import { adminMemberService } from "../../../services/admin/member/admin-member.service.js";
import { parseAdminId } from "../../../utils/admin/parse-admin-id.js";

export class AdminMemberController {
  async getMembers() {
    return adminMemberService.getMembers();
  }

  async getMemberById(id: string) {
    return adminMemberService.getMemberById(
      parseAdminId(id),
    );
  }

  async getMemberReferralTree(id: string) {
    return adminMemberService.getMemberReferralTree(
      parseAdminId(id),
    );
  }

  async updateMember(
    id: string,
    input: {
      fullName?: string;
      email?: string;
      phone?: string;
    },
  ) {
    return adminMemberService.updateMember(
      parseAdminId(id),
      input,
    );
  }

  async lockMember(id: string) {
    return adminMemberService.lockMember(
      parseAdminId(id),
    );
  }

  async unlockMember(id: string) {
    return adminMemberService.unlockMember(
      parseAdminId(id),
    );
  }
}

export const adminMemberController =
  new AdminMemberController();