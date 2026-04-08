import DefaultTheme from 'vitepress/theme'
import 'katex/dist/katex.min.css'
import './style.css'
import CourseSchedule from './components/CourseSchedule.vue'
import DeadlineCountdown from './components/DeadlineCountdown.vue'
import Announcement from './components/Announcement.vue'
import ContactInfo from './components/ContactInfo.vue'
import TimeVenue from './components/TimeVenue.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('CourseSchedule', CourseSchedule)
    app.component('DeadlineCountdown', DeadlineCountdown)
    app.component('Announcement', Announcement)
    app.component('ContactInfo', ContactInfo)
    app.component('TimeVenue', TimeVenue)
  }
}
