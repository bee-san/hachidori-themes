// SPDX-License-Identifier: GPL-3.0-or-later
import { createView } from "../jl/theme.js";

export default { schema: 2, slug: "ffxiv-aetheryte", contentMode: "rich",
  createView: options => createView(options, true),
};
