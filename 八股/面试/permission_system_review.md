# 权限系统面试复习手册 (Permission System Review Manual)

针对你简历中的“全链路权限系统”描述，以下是核心原理、项目实现细节及面试高频问题的深度罗列。

---

## 1. 核心模型：RBAC (Role-Based Access Control)
**原理描述**：
权限系统不再直接给用户分配权限，而是引入了“角色”概念。
- **关系表**：用户 ↔ 角色 (Many-to-Many)，角色 ↔ 权限 (Many-to-Many)。
- **本项目实现**：用户登录后获取 `roles` 信息，其中 `menus` 数组包含了该用户拥有的权限标识（如菜单名称）。

---

## 2. 技术实现方案：动态路由 (Dynamic Routing)
这是该点的核心。项目采用的是 **“前端配置全量异步路由 + 后端下发权限标识”** 的方案。

### A. 全局导航守卫拦截 ([permission.js](file:///e:/Work/qianduan/%E4%BA%BA%E5%8A%9B%E8%B5%84%E6%BA%90/vue3-hr/src/permission.js))
1. **外层逻辑**：判断是否有 Token。如果没有且不在白名单 (`whiteList`)，重定向至登录页。
2. **内层逻辑**：
   - 检查 Pinia 中是否有用户信息。
   - **首次刷新/登录后**：调用 [getInfo()](file:///e:/Work/qianduan/%E4%BA%BA%E5%8A%9B%E8%B5%84%E6%BA%90/vue3-hr/src/api/user.js#12-19) 获取用户详细资料（含 `roles.menus`）。
   - **路由过滤**：对比全量异步路由表 `asyncRoutes` 和后端返回的权限标识数组。
   - **动态注入**：调用 `router.addRoute()` 将匹配成功的路由逐个注入。
   - **特殊处理**：动态添加 404 捕获路由 (`pathMatch`)，必须放在动态路由注入的最后，否则会提前命中。

### B. 关键代码细节
- **`router.addRoute(route)`**：Vue Router 4 的 API。
- **`next({ ...to, replace: true })`**：这是一个极其关键的操作。
  - **为什么要这么做？** 当 `addRoute` 发生时，新的路由表还未生效。如果直接 `next()`，可能会命中 404。使用带有目标地址的 `next` 会中断当前导航并触发一次新的导航，此时新路由表已生效。

---

## 3. 面试官杀手锏问题 (Q&A)

### Q1: 为什么不在 [router/index.js](file:///e:/Work/qianduan/%E4%BA%BA%E5%8A%9B%E8%B5%84%E6%BA%90/vue3-hr/src/router/index.js) 里写死所有路由，然后用 `v-if` 隐藏菜单？
- **回答**：这属于“伪权限”。虽然 UI 隐藏了，但用户手动在地址栏输入 URL 仍能访问。真正的权限方案必须配合动态路由，确保无权限的路由在路由表中物理不存在，且通过导航守卫拦截。

### Q2: 页面刷新后，动态添加的路由为什么会丢失？怎么处理？
- **回答**：路由实例存在内存中，刷新后会重置。我们在 [permission.js](file:///e:/Work/qianduan/%E4%BA%BA%E5%8A%9B%E8%B5%84%E6%BA%90/vue3-hr/src/permission.js) 的 `beforeEach` 中做了守卫。刷新时通过判断 Store 中是否存在用户信息（或角色信息），如果不存在，则重新拉取并重执行 `addRoute` 逻辑。

### Q3: 为什么 404 路由要动态添加？
- **回答**：如果 404 路由放在静态路由表末尾，而在 [permission.js](file:///e:/Work/qianduan/%E4%BA%BA%E5%8A%9B%E8%B5%84%E6%BA%90/vue3-hr/src/permission.js) 异步加载动态路由之前就开始匹配，那么所有动态路由都会被先匹配到静态路由末尾的 404。因此 404 必须在动态路由加载完成后最后添加。

### Q4: 按钮级别的权限是如何实现的？
- **建议回答**（根据代码库习惯）：
  1. **自定义指令**：创建一个 `v-permission` 指令，接收权限字符串。指令内部根据用户权限数组判断，如果不包含该权限，则将 DOM 元素移除。
  2. **全局函数**：封装 `checkPermission` 函数，配合 `v-if` 使用。
  *注：本项目主要展示了菜单级权限适配。*

---

## 4. 复习脑图 (Summary Map)
- **Token 校验** → 存入 LocalStorage/Cookie。
- **用户信息获取** → 包含 Role & Menu 数组。
- **路由表过滤** → `asyncRoutes.filter`。
- **动态挂载** → `router.addRoute`。
- **重定向纠正** → `replace: true` 解决白屏。

---

### 💡 建议复习路径
1. 打开 [permission.js](file:///e:/Work/qianduan/人力资源/vue3-hr/src/permission.js) 读一遍 `try...catch` 里的逻辑。
2. 理解静态路由 (`constantRoutes`) 与异步路由 (`asyncRoutes`) 的区别。
3. 熟悉 `router.addRoute` 这个 API 的文档。
