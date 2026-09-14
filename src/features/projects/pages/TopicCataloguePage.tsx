import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { services } from '../../../services/service-gateway'
import type { TopicItem } from '../../../types/topic.types'
import { MultidisciplinaryTag, type MajorType } from '../../../components/ui/MultidisciplinaryTag'
import { TopicCatalogueDrawer } from '../components/TopicCatalogueDrawer'
import { useStudentJourney } from '../../../app/context'
import { env } from '../../../app/config/env'

const MAJORS: readonly (MajorType | 'ALL')[] = ['ALL', 'SE', 'UI/UX', 'AI', 'QA', 'IS']

export function TopicCataloguePage() {
  const navigate = useNavigate()
  const { semester, period } = useStudentJourney()
  const [topics, setTopics] = useState<TopicItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMajor, setSelectedMajor] = useState<MajorType | 'ALL'>('ALL')
  const [interdisciplinaryOnly, setInterdisciplinaryOnly] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<TopicItem | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadTopics = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const items = await services.topic.getTopicCatalogue({
        search: searchQuery.trim() || undefined,
        major: selectedMajor,
        isInterdisciplinaryOnly: interdisciplinaryOnly,
        academicSemesterId: semester?.id,
        projectPeriodId: period?.id,
        majorId: undefined,
        compatibleOnly: false,
      })
      setTopics(items)
    } catch (error) {
      setTopics([])
      setErrorMessage(error instanceof Error ? error.message : 'Không thể tải danh mục đề tài.')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, selectedMajor, interdisciplinaryOnly, semester?.id, period?.id])

  useEffect(() => {
    loadTopics()
  }, [loadTopics])

  const handleSelectTopic = (topic: TopicItem) => {
    navigate(`/project/register?topicId=${topic.id}`)
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-600 text-[20px] shrink-0 mt-0.5">info</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-900">Danh mục đề tài đã công bố</span>
            <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-blue-200 text-blue-900">
              {env.isMockMode ? 'DỮ LIỆU MÔ PHỎNG' : 'API BACKEND'}
            </span>
          </div>
          <p className="text-xs text-blue-800 mt-1 leading-relaxed">
            Chọn một đề tài để điền trước bản đăng ký. Việc chọn tại đây chưa giữ chỗ; bản đăng ký chỉ được ghi nhận sau khi nhóm lưu và nộp.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Danh mục Đề tài Đồ án</h1>
          <p className="text-sm text-slate-500 mt-1">
            Khám phá các hướng đề tài gợi ý từ Khoa hoặc tự đề xuất ý tưởng riêng cho nhóm
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/project/register')}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">edit_document</span>
          Tự đề xuất đề tài mới
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            id="search-topics"
            name="searchQuery"
            aria-label="Tìm kiếm đề tài"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo tên đề tài, mã số hoặc lĩnh vực..."
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        {/* Major Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {MAJORS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSelectedMajor(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedMajor === m
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 bg-slate-50'
              }`}
            >
              {m === 'ALL' ? 'Tất cả ngành' : m}
            </button>
          ))}
        </div>

        {/* Interdisciplinary Only Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 shrink-0">
          <input
            id="topics-interdisciplinary-only"
            name="interdisciplinaryOnly"
            type="checkbox"
            checked={interdisciplinaryOnly}
            onChange={(e) => setInterdisciplinaryOnly(e.target.checked)}
            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
          />
          <span>Chỉ xem đề tài liên ngành</span>
        </label>
      </div>

      {/* Topic Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          <div className="h-48 bg-slate-200 rounded-2xl" />
          <div className="h-48 bg-slate-200 rounded-2xl" />
          <div className="h-48 bg-slate-200 rounded-2xl" />
          <div className="h-48 bg-slate-200 rounded-2xl" />
        </div>
      ) : errorMessage ? (
        <div role="alert" className="flex flex-col items-center rounded-2xl border border-rose-200 bg-rose-50 px-6 py-12 text-center">
          <span className="material-symbols-outlined mb-3 text-[40px] text-rose-500" aria-hidden="true">cloud_off</span>
          <h3 className="text-base font-bold text-slate-900">Không thể tải danh mục đề tài</h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-600">
            Máy chủ dịch vụ đề tài hiện không phản hồi ({errorMessage}). Vui lòng kiểm tra kết nối hoặc thử lại.
          </p>
          <button type="button" onClick={loadTopics}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2">
            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">refresh</span>
            Thử lại
          </button>
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8">
          <span className="material-symbols-outlined text-[40px] text-slate-300 mb-2">search_off</span>
          <h3 className="text-base font-bold text-slate-800">Không tìm thấy đề tài phù hợp</h3>
          <p className="text-xs text-slate-500 mt-1">
            Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc ngành.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xs transition-all hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {topic.code}
                  </span>
                  {topic.isInterdisciplinary ? (
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      Liên ngành
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      Đơn ngành
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug hover:text-blue-600 transition-colors cursor-pointer"
                    onClick={() => setSelectedTopic(topic)}>
                  {topic.titleVi}
                </h3>
                <p className="text-xs text-slate-500 italic mt-0.5 line-clamp-1">{topic.titleEn}</p>

                <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                  {topic.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  {topic.suggestedMajors.slice(0, 3).map((m) => (
                    <MultidisciplinaryTag key={m} major={m} />
                  ))}
                  {topic.suggestedMajors.length > 3 && (
                    <span className="text-[10px] text-slate-400 font-bold self-center">
                      +{topic.suggestedMajors.length - 3}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTopic(topic)}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  Chi tiết
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Drawer */}
      <TopicCatalogueDrawer
        topic={selectedTopic}
        isOpen={Boolean(selectedTopic)}
        onClose={() => setSelectedTopic(null)}
        onSelectTopic={handleSelectTopic}
      />
    </div>
  )
}
