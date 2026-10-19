<script setup>
import { Archive, LayoutGrid, CalendarDays, History, UserRound, ArrowUpRight, ArrowLeft, LogOut, ShieldCheck, Users, ListChecks, Search, Plus, Download, Upload, ChevronRight, X, RefreshCw, LockKeyhole, Check, Menu, Mail, Leaf, SlidersHorizontal } from 'lucide-vue-next'
defineProps({ name: String, size: { type: Number, default: 20 } })
const icons = { box: Archive, grid: LayoutGrid, calendar: CalendarDays, history: History, user: UserRound, arrow: ArrowUpRight, back: ArrowLeft, logout: LogOut, shield: ShieldCheck, users: Users, list: ListChecks, search: Search, plus: Plus, download: Download, upload: Upload, right: ChevronRight, close: X, refresh: RefreshCw, lock: LockKeyhole, check: Check, menu: Menu, mail: Mail, leaf: Leaf, filters: SlidersHorizontal }
</script>
<template><component :is="icons[name] || icons.box" :size="size" :stroke-width="1.7" aria-hidden="true" /></template>
