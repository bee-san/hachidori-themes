// SPDX-License-Identifier: GPL-3.0-or-later
import { createView } from "../jl/theme.js";

export default { schema: 2, slug: "ffxiv-dark", contentMode: "rich",
  createView: options => createView(options, true),
};
